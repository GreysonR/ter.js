const vec = require("../geometry/vec.js");
const Common = require("../core/Common.js");
const Performance = require("../core/Performance.js");
const CollisionShape = require("./CollisionShape.js");

/**
 * The physics engine
 */
class Engine {
	static defaultOptions = {
		substeps: 6,
		velocityIterations: 1,
		positionIterations: 1,
		constraintIterations: 1,
		maxShare: 1,
	}

	delta = 1;
	substeps = 6;
	velocityIterations = 1;
	positionIterations = 1;
	constraintIterations = 1;
	maxShare = 1;

	/**
	 * 
	 * @param {World} World - World the physics engine should run on
	 * @param {Object} options - Physics options
	 * @param {number} [options.substeps=6] - Number of substeps per tick
	 * @param {number} [options.velocityIterations=1] - Number of velocity solver iterations per tick
	 * @param {number} [options.positionIterations=1] - Number of position solver iterations per tick
	 * @param {number} [options.constraintIterations=1] - Number of constraint solver iterations per tick
	 * @param {number} [options.maxShare=1] - Maximum share of collision impulse a body can have. Not recommended to change
	 */
	constructor(World, options = {}) {
		let defaults = { ...Engine.defaultOptions };
		Common.merge(defaults, options, 1);
		options = defaults;
		
		// Shallow copy options
		let mutableProperties = [`substeps`, `velocityIterations`, `positionIterations`, `constraintIterations`, `maxShare`];
		for (let propertyName of mutableProperties) {
			if (options[propertyName] != undefined && typeof this[propertyName] != "function") {
				this[propertyName] = options[propertyName];
			}
		}
		this.World = World;
		this.Performance = new Performance();
	}

	/**
	 * Ticks the engine one frame
	 * @param {number} [delta] - (Optional) Engine tick duration, in seconds
	 */
	update(delta) {
		const { World, Performance, substeps } = this;
		const { rigidBodies } = World;

		// Get delta
		if (delta === undefined) {
			delta = Performance.delta * World.timescale;
		}
		World.time += delta;
		delta /= substeps;
		this.delta = delta;

		// Get timing
		Performance.update();

		for (let step = 0; step < substeps; step++) {
			Performance.frame++;
			
			// Update positions / angles
			for (let body of rigidBodies) {
				body._update(delta);
			}
			
			// Find collisions
			World.globalVectors = [];
			World.globalPoints = [];
			
			const pairs = World.collisionPairs;
			for (let i = 0; i < pairs.length; i++) {
				let [ bodyA, bodyB ] = pairs[i];
				if (this.collides(bodyA, bodyB)) {
					this.createPair(bodyA, bodyB);
				}
			}

			// Apply forces
			for (let body of rigidBodies) {
				body._preUpdate(delta);
			}

			// Solve for velocities
			for (let i = 0; i < this.velocityIterations; i++) {
				this.solveVelocity();
			}
			for (let i = 0; i < this.positionIterations; i++) {
				this.solvePositions();
			}
			this.solveConstraints(delta);
		}

		this.delta = delta * substeps;
	}

	/**
	 * Checks if `bodyA` and `bodyB` are colliding
	 * @param {CollisionShape} bodyA - 1st body to check
	 * @param {CollisionShape} bodyB - 2nd body to check
	 * @return {boolean} If the bodies are colliding
	 */
	collides(bodyA, bodyB) {
		if (bodyA.parentNode.isStatic && bodyB.parentNode.isStatic) return false;

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
		if (bodyA._lastSeparations[bodyB.id]) {
			let axis = bodyA._lastSeparations[bodyB.id];
			let supportsA = getAllSupports(bodyA, axis);
			let supportsB = getAllSupports(bodyB, axis);
			let overlap = Math.min(supportsA.max - supportsB.min, supportsB.max - supportsA.min);

			if (overlap < 0.01) {
				collision = false;
			}
			else {
				delete bodyA._lastSeparations[bodyB.id];
				delete bodyB._lastSeparations[bodyA.id];
			}
		}
		if (collision) { // last separation axis didn't work - try all axes
			// ~ bodyA axes
			for (let j = 0; j < bodyA._axes.length; j++) {
				let axis = bodyA._axes[j];
				let supportsA = getAllSupports(bodyA, axis);
				let supportsB = getAllSupports(bodyB, axis);
				let overlap = Math.min(supportsA.max - supportsB.min, supportsB.max - supportsA.min);

				if (overlap < 0.01) {
					collision = false;
					bodyA._lastSeparations[bodyB.id] = axis;
					bodyB._lastSeparations[bodyA.id] = axis;
					break;
				}
			}
			// ~ bodyB axes
			for (let j = 0; j < bodyB._axes.length; j++) {
				let axis = bodyB._axes[j];
				let supportsA = getAllSupports(bodyB, axis);
				let supportsB = getAllSupports(bodyA, axis);
				let overlap = Math.min(supportsA.max - supportsB.min, supportsB.max - supportsA.min);
				
				if (overlap < 0) {
					collision = false;
					bodyA._lastSeparations[bodyB.id] = axis;
					bodyB._lastSeparations[bodyA.id] = axis;
					break;
				}
			}
		}
		return collision;
	}

	/**
	 * Creates a collision pair between `bodyA` and `bodyB`
	 * @param {CollisionShape} bodyA - 1st body to pair
	 * @param {CollisionShape} bodyB - 2nd body to pair
	 */
	createPair(bodyA, bodyB) {
		const { World, Performance } = this;
		let minDepth = Infinity;
		let normal;
		let normalPoint;
		let contactBody;
		let normalBody;
		let contacts = [];
		let numContacts = 0;

		// - get collision normal by finding point/edge pair with minimum depth
		function findNormal(bodyA, bodyB) {
			let vertices = bodyA.vertices;
			for (let i = 0; i < vertices.length; i++) {
				let curVertice = vertices[i];
				let nextVertice = vertices[(i + 1) % vertices.length];
				let curNormal = curVertice.sub(nextVertice).normal().normalize();
				let support = bodyB._getSupport(curNormal, curVertice);

				if (bodyB.containsPoint(curVertice)) {
					contacts.push({ vertice: curVertice, body: bodyA });
					numContacts++;
				}

				if (support[1] < minDepth) {
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
		if (normal === undefined) {
			console.error(bodyA, bodyB);
			throw new Error("Could not find normal");
		}

		normal.mult2(-1);
		World.globalVectors.push({ position: normalPoint, vector: new vec(normal) });
		World.globalPoints.push(...contacts.map(v => v.vertice));

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
			bodyA.parentNode.trigger("collisionActive", pair);
			bodyB.parentNode.trigger("collisionActive", pair);

			bodyA.parentNode.trigger("bodyInside", bodyB.parentNode);
			bodyB.parentNode.trigger("bodyInside", bodyA.parentNode);
		}
		else { // No collision between these bodies last frame, so collision just started
			bodyA.parentNode.trigger("collisionStart", pair);
			bodyB.parentNode.trigger("collisionStart", pair);

			bodyA.parentNode.trigger("bodyEnter", bodyB.parentNode);
			bodyB.parentNode.trigger("bodyEnter", bodyA.parentNode);
			
			bodyA.pairs.push(pairId);
			bodyB.pairs.push(pairId);
		}

		World.pairs[pairId] = pair;
	}

	/**
	 * Deletes the collision pair
	 * @param {Object} pair - Pair to delete
	 * @return {boolean} If pair was successfully removed, meaning they are no longer colliding
	 */
	cleansePair(pair) {
		const { Performance, World } = this;
		if (pair.frame < Performance.frame) {
			let { bodyA, bodyB } = pair;

			// Remove pair
			bodyA.pairs.splice(bodyA.pairs.indexOf(pair.id), 1);
			bodyB.pairs.splice(bodyB.pairs.indexOf(pair.id), 1);
			delete World.pairs[pair.id];

			// Trigger collisionEnd event
			bodyA.trigger("collisionEnd", pair);
			bodyB.trigger("collisionEnd", pair);

			bodyA.trigger("bodyExit", bodyB);
			bodyB.trigger("bodyExit", bodyA);

			return true;
		}
		return false;
	}

	/**
	 * Solves velocity constriants on current collision pairs
	 * Also clears collision pairs that are no longer valid (they haven't collided this frame)
	 */
	solveVelocity() {
		let { pairs } = this.World;
		
		for (let i in pairs) {
			let pair = pairs[i];
			if (!pair || this.cleansePair(pair)) continue;

			let { bodyA: collisionShapeA, bodyB: collisionShapeB, normal, tangent, contacts, depth } = pair;
			let bodyA = collisionShapeA.parentNode;
			let bodyB = collisionShapeB.parentNode;

			let numContacts = contacts.length;
			if (numContacts === 0) continue;

			if (bodyA.isSensor || bodyB.isSensor) continue;

			const restitution = 1 + Math.max(bodyA.restitution, bodyB.restitution);
			const relVel = bodyB.velocity.sub(bodyA.velocity);
			const friction = Math.sqrt(bodyA.friction ** 2 + bodyB.friction ** 2);

			if (relVel.dot(normal) < 0) {
				continue;
			}

			let impulse = new vec(0, 0);
			let angImpulseA = 0;
			let angImpulseB = 0;

			let totalMass = bodyA.mass + bodyB.mass;
			let shareA = (bodyB.mass / totalMass) || 0;
			let shareB = (bodyA.mass / totalMass) || 0;
			let maxShare = this.maxShare;
			shareA = Math.min(maxShare, shareA);
			shareB = Math.min(maxShare, shareB);
			if (bodyA.isStatic) shareB = 1;
			if (bodyB.isStatic) shareA = 1;

			for (let c = 0; c < numContacts; c++) {
				const { vertice } = contacts[c];

				const offsetA = vertice.sub(bodyA.position);
				const offsetB = vertice.sub(bodyB.position);
				const vrA = bodyA.velocity.add(offsetA.cross(bodyA.angularVelocity));
				const vrB = bodyB.velocity.add(offsetB.cross(bodyB.angularVelocity));
				const relativeVelocity = vrA.sub(vrB);
				const normalVelocity = relativeVelocity.dot(normal);
				const tangentVelocity = relativeVelocity.dot(tangent);

				if (normalVelocity > 0) continue;

				let rnA = offsetA.cross(normal);
				let rnB = offsetB.cross(normal);
				let kNormal = bodyA._inverseMass + bodyB._inverseMass + bodyA._inverseInertia * rnA * rnA + bodyB._inverseInertia * rnB * rnB;

				let share = 1 / (contacts.length * kNormal);
				
				const normalImpulse = normalVelocity * share * 0.5;
				let tangentImpulse = tangentVelocity * share * 0.5;


				// Coulomb Ff <= μFn
				if (Math.abs(tangentImpulse) > Math.abs(normalVelocity) * friction) {
					tangentImpulse = Math.abs(normalImpulse) * Math.sign(tangentImpulse) * friction;
				}

				// const normalMass = (kNormal > 0 ? 1 / kNormal : 0) / contacts.length;
				// const bias = -depth / delta * 0;
				// let normalImpulse = normalMass * (normalVelocity + bias) * 0.4 * restitution;
				
				// float bias = separation / delta
				// float impulse = -cp->normalMass * 1 * (vn + bias) - impulseScale * cp->normalImpulse;

				/*
				// Compute normal impulse
				float impulse = -cp->normalMass * massScale * (vn + bias) - impulseScale * cp->normalImpulse;

				// Clamp the accumulated impulse
				float newImpulse = S2_MAX(cp->normalImpulse + impulse, 0.0f);
				impulse = newImpulse - cp->normalImpulse;
				cp->normalImpulse = newImpulse;

				// Apply contact impulse
				s2Vec2 P = s2MulSV(impulse, normal);
				vA = s2MulSub(vA, mA, P);
				wA -= iA * s2Cross(rA, P);

				vB = s2MulAdd(vB, mB, P);
				wB += iB * s2Cross(rB, P);
				*/

				const curImpulse = normal.mult(normalImpulse * restitution).add2(tangent.mult(tangentImpulse));
				impulse.add2(curImpulse);
				angImpulseA += offsetA.cross(curImpulse) * bodyA._inverseInertia;
				angImpulseB += offsetB.cross(curImpulse) * bodyB._inverseInertia;
			}
			
			if (!bodyA.isStatic) {
				bodyA.velocity.sub2(impulse.mult(bodyA._inverseMass));
				bodyA.angularVelocity -= angImpulseA * bodyA._inverseMass;
			}
			if (!bodyB.isStatic) {
				bodyB.velocity.add2(impulse.mult(bodyB._inverseMass));
				bodyB.angularVelocity += angImpulseB * bodyB._inverseMass;
			}
		}
	}
	
	/**
	 * Solves position intersections between bodies based on their collision pairs
	 */
	solvePositions() {
		const { World } = this;
		let { pairs } = World;
		
		for (let i in pairs) {
			let pair = pairs[i];
			let { depth, bodyA: collisionShapeA, bodyB: collisionShapeB, normal } = pair;
			let bodyA = collisionShapeA.parentNode;
			let bodyB = collisionShapeB.parentNode;
			
			if (bodyA.isSensor || bodyB.isSensor) continue;
			if (depth < 1) continue;

			let impulse = normal.mult(depth - 1);
			let totalMass = bodyA.mass + bodyB.mass;
			let shareA = (bodyB.mass / totalMass) || 0;
			let shareB = (bodyA.mass / totalMass) || 0;
			let maxShare = this.maxShare;
			shareA = Math.min(maxShare, shareA);
			shareB = Math.min(maxShare, shareB);
			if (bodyA.isStatic) shareB = 1;
			if (bodyB.isStatic) shareA = 1;

			if (!bodyA.isStatic) {
				let a = impulse.mult(shareA * 1 / collisionShapeA.pairs.length);
				bodyA.translate(a)
			}
			if (!bodyB.isStatic) {
				let a = impulse.mult(-shareB * 1 / collisionShapeB.pairs.length);
				bodyB.translate(a)
			}
			pair.depth -= impulse.length;
		}
	}

	/**
	 * Solves physics constraints for their new position and velocity
	 * @param {number} delta - Engine tick duration, in seconds
	 */
	solveConstraints(delta) {
		delta *= 1000;
		const constraints = this.World.constraints;
		const constraintIterations = this.constraintIterations;
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
				let maxShare = this.maxShare;
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
						angularImpulse: offset.cross(curImpulse) * body._inverseInertia / 2,
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
module.exports = Engine;
