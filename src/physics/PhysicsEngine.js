const vec = require("../geometry/vec.js");

module.exports = class Physics {
	delta = 1;
	substeps = 5;
	velocityIterations = 1;
	positionIterations = 5;
	constraintIterations = 1;
	maxShare = 1;

	/**
	 * 
	 * @param {ter.World} world The world the physics engine should run on
	 * @param {*} options Engine options object. Can contain `substeps`, `velocityIterations`, `positionIterations`, `constraintIterations`, `maxShare`
	 */
	constructor(world, options = {}) {
		// Shallow copy options
		let mutableProperties = [`substeps`, `velocityIterations`, `positionIterations`, `constraintIterations`, `maxShare`];
		for (let propertyName of mutableProperties) {
			if (options[propertyName] != undefined && typeof this[propertyName] != "function") {
				this[propertyName] = options[propertyName];
			}
		}
		this.world = world;
	}

	update = function(delta) {
		const { World, Engine, Performance } = ter;
		const { bodies } = World;
		const { substeps } = Engine;

		// Get delta
		if (delta === undefined) {
			delta = Performance.delta * ter.World.timescale / 1000;
		}
		World.time += delta;
		delta /= substeps;
		Engine.delta = delta;

		// Get timing
		Performance.update();

		for (let step = 0; step < substeps; step++) {
			Performance.frame++;
			
			// Update positions / angles
			for (let i = 0; i < bodies.length; i++) {
				let body = bodies[i];
				body.trigger("duringUpdate");
				ter.Bodies.update(body, delta);
			}
			
			// Find collisions
			globalVectors = [];
			globalPoints = [];
			
			const pairs = World.collisionPairs;
			for (let i = 0; i < pairs.length; i++) {
				let bodyA = pairs[i][0];
				let bodyB = pairs[i][1];	
				if (this.collides(bodyA, bodyB)) {
					this.createPair(boydA, bodyB);
				}
			}

			// Apply forces
			for (let i = 0; i < bodies.length; i++) {
				let body = bodies[i];
				body.trigger("beforeUpdate");
				ter.Bodies.preUpdate(body, delta);
			}

			// Solve for velocities
			for (let i = 0; i < this.velocityIterations; i++) {
				Engine.solveVelocity(delta);
			}
			for (let i = 0; i < this.positionIterations; i++) {
				Engine.solvePositions();
			}
			Engine.solveConstraints(delta);
		}

		Engine.delta = delta * substeps;
	}
	collides = function(bodyA, bodyB) {
		const World = bodyA.world;
		if (bodyA.isStatic && bodyB.isStatic) return false;

		let collision = true;

		function getAllSupports(body, direction) {
			let vertices = body.vertices;
			let maxDist = -Infinity;
			let minDist = Infinity;
			// let maxVert, minVert;

			for (let i = 0; i < vertices.length; i++) {
				let dist = direction.dot(vertices[i]);

				if (dist > maxDist) {
					maxDist = dist;
					// maxVert = i;
				}
				if (dist < minDist) {
					minDist = dist;
					// minVert = i;
				}
			}

			return { max: maxDist, min: minDist };
		}

		// - find if colliding with SAT
		// ~ reuse last separation axis
		if (bodyA.lastSeparations[bodyB.id]) {
			let axis = bodyA.lastSeparations[bodyB.id];
			let supportsA = getAllSupports(bodyA, axis);
			let supportsB = getAllSupports(bodyB, axis);
			let overlap = Math.min(supportsA.max - supportsB.min, supportsB.max - supportsA.min);

			if (overlap < 0) {
				collision = false;
			}
			else {
				delete bodyA.lastSeparations[bodyB.id];
				delete bodyB.lastSeparations[bodyA.id];
			}
		}
		if (collision) { // last separation didn't work - try all axes
			// ~ bodyA axes
			for (let j = 0; j < bodyA.axes.length; j++) {
				let axis = bodyA.axes[j];
				let supportsA = getAllSupports(bodyA, axis);
				let supportsB = getAllSupports(bodyB, axis);
				let overlap = Math.min(supportsA.max - supportsB.min, supportsB.max - supportsA.min);

				if (overlap < 0) {
					collision = false;
					bodyA.lastSeparations[bodyB.id] = axis;
					bodyB.lastSeparations[bodyA.id] = axis;
					break;
				}
			}
			// ~ bodyB axes
			for (let j = 0; j < bodyB.axes.length; j++) {
				let axis = bodyB.axes[j];
				let supportsA = getAllSupports(bodyB, axis);
				let supportsB = getAllSupports(bodyA, axis);
				let overlap = Math.min(supportsA.max - supportsB.min, supportsB.max - supportsA.min);
				
				if (overlap < 0) {
					collision = false;
					bodyA.lastSeparations[bodyB.id] = axis;
					bodyB.lastSeparations[bodyA.id] = axis;
					break;
				}
			}
		}

		if (collision === true) {
		}
	}
	createPair(bodyA, bodyB) {
		// - get collision normal by finding point with minimum depth
		let minDepth = Infinity;
		let normal;
		let normalPoint;
		let contactBody;
		let normalBody;
		let contacts = [];
		let numContacts = 0;

		function findNormal(bodyA, bodyB) {
			let vertices = bodyA.vertices;
			for (let i = 0; i < vertices.length; i++) {
				let curVertice = vertices[i];
				let nextVertice = vertices[(i + 1) % vertices.length];
				let curNormal = curVertice.sub(nextVertice).normal().normalize();
				let support = bodyB.getSupport(curNormal, curVertice);

				if (bodyB.containsPoint(curVertice)) {
					contacts.push({ vertice: curVertice, body: bodyA });
					numContacts++;
				}

				if (support[1] < minDepth && !bodyB.isStatic) {
					minDepth = support[1];
					normal = curNormal.mult(-1);
					normalPoint = curVertice.avg(nextVertice);

					normalBody = bodyB;
					contactBody = bodyA;
				}
			}
		}

		findNormal(bodyA, bodyB);
		findNormal(bodyB, bodyA);

		if (contacts.length === 0) {
			contacts.push({ vertice: new vec(bodyA.position), body: bodyA });
		}

		if (Render.showCollisions) {
			globalVectors.push({ position: normalPoint, vector: normal.mult(-1) });
			globalPoints.push(...contacts.map(v => v.vertice));
		}

		normal = normal.mult(-1);

		let pairId = Common.pairCommon(bodyA.id, bodyB.id);
		let pair = {
			bodyA: contactBody,
			bodyB: normalBody,
			depth: minDepth,
			penetration: normal.mult(minDepth),
			contacts: contacts,
			totalContacts: numContacts,
			normal: normal,
			tangent: normal.normal(),

			id: pairId,
			frame: Performance.frame,
			start: World.time,
		}

		if (World.pairs[pairId]) { // Collision happened last frame, so it's active
			pair.start = World.pairs[pairId].start;
			bodyA.trigger("collisionActive", pair);
			bodyB.trigger("collisionActive", pair);
		}
		else { // No collision between these bodies last frame, so collision just started
			bodyA.trigger("collisionStart", pair);
			bodyB.trigger("collisionStart", pair);
			
			bodyA.pairs.push(pairId);
			bodyB.pairs.push(pairId);
		}

		World.pairs[pairId] = pair;
	}
	solveVelocity = function() {
		let { pairs } = ter.World;
		
		for (let i in pairs) {
			let pair = pairs[i];
			if (!pair || ter.Bodies.cleansePair(pair)) continue;

			let { bodyA, bodyB, normal, tangent, contacts } = pair;
			let numContacts = contacts.length;
			if (numContacts === 0) continue;

			while (bodyA.parent && bodyA.parent !== bodyA) {
				bodyA = bodyA.parent;
			}
			while (bodyB.parent && bodyB.parent !== bodyB) {
				bodyB = bodyB.parent;
			}
			if (bodyA.isSensor || bodyB.isSensor) continue;

			const restitution = 1 + Math.max(bodyA.restitution, bodyB.restitution);
			const relVel = bodyB.velocity.sub(bodyA.velocity);
			const friction = Math.max(bodyA.friction, bodyB.friction);
			const slop = Math.max(bodyA.slop, bodyB.slop);

			if (relVel.dot(normal) < 0) {
				continue;
			}

			let impulse = new vec(0, 0);
			let angImpulseA = 0;
			let angImpulseB = 0;

			let totalMass = bodyA.mass + bodyB.mass;
			let shareA = (bodyB.mass / totalMass) || 0;
			let shareB = (bodyA.mass / totalMass) || 0;
			let maxShare = ter.Engine.maxShare;
			shareA = Math.min(maxShare, shareA);
			shareB = Math.min(maxShare, shareB);
			if (bodyA.isStatic) shareB = 1;
			if (bodyB.isStatic) shareA = 1;

			for (let c = 0; c < numContacts; c++) {
				const { vertice } = contacts[c];

				const offsetA = vertice.sub(bodyA.position);
				const offsetB = vertice.sub(bodyB.position);
				const vpA = bodyA.velocity.add(offsetA.normal().mult(-bodyA.angularVelocity));
				const vpB = bodyB.velocity.add(offsetB.normal().mult(-bodyB.angularVelocity));
				var relativeVelocity = vpA.sub(vpB);
				const normalVelocity = relativeVelocity.abs().sub(slop).mult(relativeVelocity.sign()).dot(normal);
				const tangentVelocity = relativeVelocity.dot(tangent);

				let oAcN = offsetA.cross(normal);
				let oBcN = offsetB.cross(normal);
				let share = 1 / (contacts.length * (bodyA.inverseMass + bodyB.inverseMass + bodyA.inverseInertia * oAcN * oAcN  + bodyB.inverseInertia * oBcN * oBcN));

				if (normalVelocity > 0) continue;
				
				const normalImpulse = restitution * normalVelocity * share;
				const tangentImpulse = restitution * tangentVelocity * share;

				const curImpulse = normal.mult(normalImpulse).add2(tangent.mult(tangentImpulse * friction));
				impulse.set(curImpulse);
				angImpulseA = offsetA.cross(curImpulse) * bodyA.inverseInertia;
				angImpulseB = offsetB.cross(curImpulse) * bodyB.inverseInertia;

				if (!bodyA.isStatic) {
					bodyA.velocity.sub2(impulse.mult(1 / bodyA.mass));
					bodyA.angularVelocity -= angImpulseA / bodyA.mass;
				}
				if (!bodyB.isStatic) {
					bodyB.velocity.add2(impulse.mult(1 / bodyB.mass));
					bodyB.angularVelocity += angImpulseB / bodyB.mass;
				}
			}
		}
	}
	solvePositions = function() {
		const World = ter.World;
		const Bodies = ter.Bodies;
		let { pairs } = World;
		
		for (let i in pairs) {
			let pair = pairs[i];
			if (!pair || Bodies.cleansePair(pair)) continue;
			let { depth, bodyA, bodyB, normal } = pair;
			depth = Math.min(depth, 1.5);

			while (bodyA.parent && bodyA.parent !== bodyA) {
				bodyA = bodyA.parent;
			}
			while (bodyB.parent && bodyB.parent !== bodyB) {
				bodyB = bodyB.parent;
			}
			if (bodyA.isSensor || bodyB.isSensor) continue;
			
			if (depth < 1) continue;

			let impulse = normal.mult(depth - 1);
			let totalMass = bodyA.mass + bodyB.mass;
			let shareA = (bodyB.mass / totalMass) || 0;
			let shareB = (bodyA.mass / totalMass) || 0;
			let maxShare = ter.Engine.maxShare;
			shareA = Math.min(maxShare, shareA);
			shareB = Math.min(maxShare, shareB);
			if (bodyA.isStatic) shareB = 1;
			if (bodyB.isStatic) shareA = 1;
			if (bodyA.isStatic || bodyB.isStatic) impulse.mult(0);

			if (!bodyA.isStatic) {
				let a = impulse.mult(shareA * 0.95 / bodyA.pairs.length);
				bodyA.translate(a);
			}
			if (!bodyB.isStatic) {
				let a = impulse.mult(-shareB * 0.95 / bodyB.pairs.length);
				bodyB.translate(a);
			}
			pair.depth -= impulse.length;
		}
	}
	solveConstraints = function(delta) {
		delta *= 1000;
		const constraints = ter.World.constraints;
		const constraintIterations = ter.Engine.constraintIterations;
		delta /= constraintIterations;

		for (let step = 0; step < constraintIterations; step++) {
			for (let i = 0; i < constraints.length; i++) {
				let constraint = constraints[i];
				let { bodyA, bodyB, offsetA, offsetB, stiffness, angularStiffness, length, ignoreSlack } = constraint;
				let pointA = bodyA.position.add(offsetA.rotate(bodyA.angle));
				let pointB = bodyB.position.add(offsetB.rotate(bodyB.angle));

				// constraint velocity solver
				let diff = pointA.sub(pointB);
				let normal = diff.normalize();
				let tangent = normal.normal();

				let totalMass = bodyA.mass + bodyB.mass;
				let shareA = (bodyB.mass / totalMass) || 0;
				let shareB = (bodyA.mass / totalMass) || 0;
				let maxShare = ter.Engine.maxShare;
				shareA = Math.min(maxShare, shareA);
				shareB = Math.min(maxShare, shareB);
				if (bodyA.isStatic) shareB = 1;
				if (bodyB.isStatic) shareA = 1;

				function solveImpulse(vertice, point, body) { // vertice = where the constraint goes to, point = where the constraint is
					let offset = point.sub(body.position);
					let offsetLen = offset.length;
					if (offsetLen > length * 3) {
						offset.mult2(length / offsetLen);
					}
					const vp1 = body.velocity.add(offset.normal().mult(-body.angularVelocity));
					const vp2 = vertice.sub(point).mult(stiffness * 30);
					if (ignoreSlack && diff.length < length * (1 + stiffness)) { // idk how to get this to work
						vp1.mult2(0);
						vp2.mult2(0);
					}
					const relativeVelocity = vp1.sub(vp2);
					const normalVelocity = relativeVelocity.dot(normal);
					const tangentVelocity = relativeVelocity.dot(tangent);
					let tangentImpulse = tangentVelocity;
					
					let normalImpulse = (stiffness) * normalVelocity; // min is to prevent breakage
					normalImpulse = Math.min(Math.abs(normalImpulse), 300) * Math.sign(normalImpulse);
					let curImpulse = normal.mult(normalImpulse).add2(tangent.mult(tangentImpulse * angularStiffness));

					return {
						angularImpulse: offset.cross(curImpulse) * body.inverseInertia / 2,
						normalImpulse: curImpulse.mult(0.5),
					}
				}

				let impulseDiff = pointA.sub(pointB).normalize().mult(length);
				let impulsePtA = bodyA.isStatic ? pointA : pointB.add(impulseDiff);
				let impulsePtB = bodyB.isStatic ? pointB : pointA.sub(impulseDiff);

				let { angularImpulse: angImpulseA, normalImpulse: impulseA } = solveImpulse(impulsePtA, pointA, bodyA);
				let { angularImpulse: angImpulseB, normalImpulse: impulseB } = solveImpulse(impulsePtB, pointB, bodyB);
				
				if (!bodyA.isStatic) {
					bodyA.velocity.sub2(impulseA.mult(shareA * delta));
					bodyA.angularVelocity -= angImpulseA * shareA * delta;
				}
				if (!bodyB.isStatic) {
					bodyB.velocity.sub2(impulseB.mult(shareB * delta));
					bodyB.angularVelocity -= angImpulseB * shareB * delta;
				}

				// constraint position solver
				// let nextLength = pointA.sub(pointB).length + (length - pointA.sub(pointB).length) * stiffness;
				// let changeA = nextLength - impulsePtB.sub(bodyA.position).length;
				// changeA = Math.min(50, Math.abs(changeA)) * Math.sign(changeA);
				// let changeB = nextLength - impulsePtA.sub(bodyB.position).length;
				// changeB = Math.min(50, Math.abs(changeB)) * Math.sign(changeB);

				// bodyA.translate(normal.mult((changeA) * shareA * delta * 0.05));
				// bodyB.translate(normal.mult((changeB) * shareB * delta * 0.05));

				constraint.updateBounds();
			}

		}
	}
};
