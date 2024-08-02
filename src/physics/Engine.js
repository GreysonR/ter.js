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
	}

	delta = 1;
	inverseDelta = 1;
	substeps = 6;
	velocityIterations = 1;
	positionIterations = 1;
	constraintIterations = 1;

	/**
	 * 
	 * @param {World} World - World the physics engine should run on
	 * @param {Object} options - Physics options
	 * @param {number} [options.substeps=6] - Number of substeps per tick
	 * @param {number} [options.velocityIterations=1] - Number of velocity solver iterations per tick
	 * @param {number} [options.positionIterations=1] - Number of position solver iterations per tick
	 * @param {number} [options.constraintIterations=1] - Number of constraint solver iterations per tick
	 */
	constructor(World, options = {}) {
		let defaults = { ...Engine.defaultOptions };
		Common.merge(defaults, options, 1);
		options = defaults;
		
		// Shallow copy options
		let mutableProperties = [`substeps`, `velocityIterations`, `positionIterations`, `constraintIterations`];
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
	 * @param {number} [delta] - Engine tick duration, in seconds
	 */
	update(delta = undefined) {
		const { World, Performance, substeps } = this;
		const { rigidBodies } = World;

		// Get delta
		if (delta === undefined) {
			delta = Performance.delta * World.timescale;
		}
		World.time += delta;
		delta /= substeps;
		this.delta = delta;
		this.inverseDelta = 1 / this.delta;

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

			let contactHertz = Math.min(30, 0.25 * this.inverseDelta / this.velocityIterations);
			// let jointHertz = Math.min(60, 0.125 * this.inverseDelta);

			// Prepare contacts
			this.prepareContacts(delta, contactHertz);

			// Solve for velocities
			for (let i = 0; i < this.velocityIterations; i++) {
				this.solveVelocity(true);
				this.solveVelocity(false);
			}

			// Solve positions
			for (let i = 0; i < this.positionIterations; i++) {
				this.solvePositions();
			}

			// Solve constraints
			this.solveConstraints(delta);
		}

		this.delta = delta * substeps;
		this.inverseDelta = 1 / this.delta;
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
		let overlapMargin = 0;

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

			if (overlap < overlapMargin) {
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

				if (overlap < overlapMargin) {
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
				
				if (overlap < overlapMargin) {
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
	 * @todo Make collision pairs their own class
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
					contacts.push({
						vertice: curVertice,
						incidentBody: bodyA,
						referenceBody: bodyB,

						normalImpulse: 0,
						tangentImpulse: 0,
					});
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
			contacts.push({
				vertice: new vec(bodyA.position),
				incidentBody: bodyA,
				referenceBody: bodyB,
				
				normalImpulse: 0,
				tangentImpulse: 0,
			});
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

			friction: Math.sqrt(contactBody.parentNode.friction ** 2 + normalBody.parentNode.friction ** 2),
			restitution: 1 + Math.max(contactBody.parentNode.restitution, normalBody.parentNode.restitution),

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

	prepareContacts(delta, hertz) {
		let { pairs } = this.World;
		for (let i in pairs) {
			let pair = pairs[i];
			const { bodyA: collisionShapeA, bodyB: collisionShapeB, normal, tangent, contacts, depth: rawDepth } = pair;
			const depth = rawDepth;
			const bodyA = collisionShapeA.parentNode;
			const bodyB = collisionShapeB.parentNode;

			const { _inverseMass: mA, _inverseInertia : iA, position: positionA } = bodyA;
			const { _inverseMass: mB, _inverseInertia : iB, position: positionB } = bodyB;

			// Stiffer for dynamic vs static
			let contactHertz = (mA === 0 || mB === 0) ? 2 * hertz : hertz;
			
			for (let cp of contacts) {
				// warm starting, but that's not implemented yet
				cp.normalImpulse = 0;
				cp.tangentImpulse = 0;

				// Adjusted separation
				let rA = cp.vertice.sub(positionA);
				let rB = cp.vertice.sub(positionB);
				cp.adjustedSeparation = depth;// - rB.sub(rA).dot(normal);

				// Normal mass
				let rnA = rA.cross(normal);
				let rnB = rB.cross(normal);
				let kNormal = mA + mB + (iA * rnA**2) + (iB * rnB ** 2);
				cp.normalMass = kNormal > 0 ? 1 / kNormal : 0;

				// Tangent mass
				let rtA = rA.cross(tangent);
				let rtB = rB.cross(tangent);
				let kTangent = mA + mB + (iA * rtA ** 2) + (iB * rtB ** 2);
				cp.tangentMass = kTangent > 0 ? 1 / kTangent : 0;

				// Soft constraint coefficients
				const zeta = 10;
				let omega = 2 * Math.PI * contactHertz;
				let c = delta * omega * (2 * zeta + delta * omega);
				cp.biasCoefficient = omega / (2 * zeta + delta * omega);
				cp.impulseCoefficient = 1 / (1 + c);
				cp.massCoefficient = c * cp.impulseCoefficient / contacts.length;
			}
		}
	}
	/**
	 * Solves velocity constriants on current collision pairs
	 * Also clears collision pairs that are no longer valid (they haven't collided this frame)
	 */
	solveVelocity(useBias = true) {
		let { pairs } = this.World;
		let inv_h = this.inverseDelta;
		
		for (let i in pairs) {
			let pair = pairs[i];
			if (!pair || this.cleansePair(pair)) continue;

			const { bodyA: collisionShapeA, bodyB: collisionShapeB, normal, tangent, contacts, friction, restitution } = pair;
			const bodyA = collisionShapeA.parentNode;
			const bodyB = collisionShapeB.parentNode;

			if (contacts.length === 0) continue;
			if (bodyA.isSensor || bodyB.isSensor) continue;

			let { _inverseMass: mA, _inverseInertia : iA, angularVelocity: wA, velocity: vA, position: positionA } = bodyA;
			let { _inverseMass: mB, _inverseInertia : iB, angularVelocity: wB, velocity: vB, position: positionB } = bodyB;

			for (let contact of contacts) {
				const { vertice: cp } = contact;

				const rA = cp.sub(positionA); // radius vector A
				const rB = cp.sub(positionB); // radius vector B

				// Relative velocity
				const vrA = bodyA.velocity.add(rA.cross(bodyA.angularVelocity));
				const vrB = bodyB.velocity.add(rB.cross(bodyB.angularVelocity));
				const normalVelocity = vrB.sub(vrA).dot(normal);

				// Separation
				const ds = bodyB.velocity.sub(bodyA.velocity).add(rB.sub(rA));
				const s = Math.max(ds.dot(normal) * this.delta + contact.adjustedSeparation - 2, 0); // separation scalar

				// Impulse scale, mass scale (meff), and bias (baumgarte stabilization)
				let bias = 0;
				let massScale = 1;
				let impulseScale = 0;
				const maxBaumgarteVelocity = 4;
				if (s < 0) {
					bias = s * inv_h; // Speculative
				}
				else if (useBias) {
					bias = Math.max(contact.biasCoefficient * s, -maxBaumgarteVelocity);
					massScale = contact.massCoefficient;
					impulseScale = contact.impulseCoefficient;
				}
				
				let impulse = contact.normalMass * massScale * (normalVelocity * restitution + bias);// - impulseScale * contact.normalImpulse;

				if (false) { // Clamping current impulse rather than accumulated works better under certain circumstances (ie newton pendulum test) and makes no difference in others
					// Clamp accumulated impulse
					let newImpulse = Math.max(contact.normalImpulse + impulse, 0);
					impulse = newImpulse - contact.normalImpulse;
					contact.normalImpulse = newImpulse;
				}
				else {
					// Clamp current impulse
					impulse = Math.max(impulse, 0);
					contact.normalImpulse += impulse;
				}
				
				// Apply contact impulse
				let P = normal.mult(impulse);

				vA = vA.add(P.mult(mA));
				wA += iA * rA.cross(P);

				vB = vB.sub(P.mult(mB));
				wB -= iB * rB.cross(P);
			}

			for (let contact of contacts) {
				const { vertice: cp, tangentMass } = contact;

				const rA = cp.sub(positionA); // radius vector A
				const rB = cp.sub(positionB); // radius vector B

				// Relative velocity
				const vrA = vA.add(rA.cross(wA));
				const vrB = vB.add(rB.cross(wB));
				const vt = vrB.sub(vrA).dot(tangent);

				// Tangent force
				let impulse = -tangentMass * vt;
				
				if (true) {
					// Clamp accumulated force
					const maxFriction = friction * contact.normalImpulse;
					let newImpulse = Common.clamp(contact.tangentImpulse + impulse, -maxFriction, maxFriction);
					impulse = newImpulse - contact.tangentImpulse;
					contact.tangentImpulse = newImpulse;
				}
				else {
					// Clamp current force
					const maxFriction = friction * contact.normalImpulse;
					impulse = Common.clamp(impulse, -maxFriction, maxFriction);
					contact.tangentImpulse += impulse;
				}

				// Apply contact impulse
				let P = tangent.mult(impulse);

				vA = vA.sub(P.mult(mA));
				wA -= iA * rA.cross(P);
				
				vB = vB.add(P.mult(mB));
				wB += iB * rB.cross(P);
			}
			
			if (!bodyA.isStatic) {
				bodyA.velocity.set(vA);
				bodyA.angularVelocity = wA;
			}
			if (!bodyB.isStatic) {
				bodyB.velocity.set(vB);
				bodyB.angularVelocity = wB;
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
			let { depth, bodyA: collisionShapeA, bodyB: collisionShapeB, normal, contacts } = pair;
			let bodyA = collisionShapeA.parentNode;
			let bodyB = collisionShapeB.parentNode;
			if (bodyA.isSensor || bodyB.isSensor) continue;
			
			let { _inverseMass: mA } = bodyA;
			let { _inverseMass: mB } = bodyB;

			let impulse = Math.max(-0.01, depth - 0.1);
			pair.depth -= impulse;

			let totalM = mA + mB;

			if (!bodyA.isStatic) {
				bodyA.translate(normal.mult( impulse * mA / totalM));
			}
			if (!bodyB.isStatic) {
				bodyB.translate(normal.mult(-impulse * mB / totalM));
			}
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
