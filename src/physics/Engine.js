const vec = require("../geometry/vec.js");
const Common = require("../core/Common.js");
const Performance = require("../core/Performance.js");
const CollisionShape = require("./CollisionShape.js");

/**
 * The physics engine
 */
class Engine {
	static defaultOptions = {
		substeps: 3,
		velocityIterations: 2,
		positionIterations: 3,
		constraintIterations: 1,
		
		slop: 1,
		overlapMargin: 0,
		positionWarming: 0.8,
		positionDampen: 0.9,
	}

	delta = 1;
	inverseDelta = 1;
	
	substeps;
	velocityIterations;
	positionIterations;
	constraintIterations;
	
	slop;
	overlapMargin;
	positionWarming = 0.8;
	positionDampen;

	/**
	 * 
	 * @param {World} World - World the physics engine should run on
	 * @param {Object} options - Physics options
	 * @param {number} [options.substeps=3] - Number of substeps per tick
	 * @param {number} [options.velocityIterations=2] - Number of velocity solver iterations per tick
	 * @param {number} [options.positionIterations=3] - Number of position solver iterations per tick
	 * @param {number} [options.constraintIterations=1] - Number of constraint solver iterations per tick
	 * @param {number} [options.overlapMargin=0.01] - Amount of overlap required for a collision to register
	 * @param {number} [options.slop=1] - Amount of acceptable penetration
	 * @param {number} [options.positionDampen=0.9] - How much the position impulse is multiplied by. Decrease if unstable.
	 */
	constructor(World, options = {}) {
		let defaults = { ...Engine.defaultOptions };
		Common.merge(defaults, options, 1);
		options = defaults;
		
		// Shallow copy options
		let mutableProperties = [`substeps`, `velocityIterations`, `positionIterations`, `constraintIterations`, `slop`, `positionDampen`];
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
		Performance.frame++;

		for (let step = 0; step < substeps; step++) {
			// Find collisions
			World.globalVectors.length = 0;
			World.globalPoints.length = 0;
			
			const pairs = World.collisionPairs;
			for (let i = 0; i < pairs.length; i++) {
				let [ bodyA, bodyB ] = pairs[i];
				if (this.collides(bodyA, bodyB)) {
					this.#createManifold(bodyA, bodyB);
				}
			}
	
			// Prepare contacts
			let contactHertz = Math.min(30, 0.25 * this.inverseDelta ** 0.5);
			// let jointHertz = Math.min(60, 0.125 * this.inverseDelta);
			this.prepareContacts(delta, contactHertz);
			
			// Apply forces
			for (let body of rigidBodies) {
				body._preUpdate(delta);
			}

			// Solve for velocities
			for (let i = 0; i < this.velocityIterations; i++) {
				this.solveVelocity(true);
				this.solveVelocity(false);
			}

			// Solve positions
			if (this.positionIterations > 0) {
				this.preSolvePosition();
				for (let i = 0; i < this.positionIterations; i++) {
					this.solvePosition();
				}
				this.postSolvePosition();
			}

			// Update positions / angles
			let lastStep = step + 1 == substeps;
			for (let body of rigidBodies) {
				body._update(delta, lastStep);
			}
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
		let overlapMargin = this.overlapMargin;

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
	#createManifold(bodyA, bodyB) {
		const { World, Performance } = this;
		let depth = Infinity;
		let normal, normalPoint;
		let referenceBody, incidentBody;
		let contacts = [];

		// - get collision normal by finding point/edge pair with minimum depth
		let [contactsA, depthA, normalA, anchorB] = this.#findNormal(bodyA, bodyB);
		let [contactsB, depthB, normalB, anchorA] = this.#findNormal(bodyB, bodyA);

		if (depthA <= depthB) {
			depth = depthA;
			normal = normalA;
			incidentBody = bodyA;
			referenceBody = bodyB;
			normalPoint = bodyA.vertices[anchorA].avg(bodyA.vertices[(anchorA - 1 + bodyA.vertices.length) % bodyA.vertices.length]);
		}
		else {
			depth = depthB;
			normal = normalB;
			incidentBody = bodyB;
			referenceBody = bodyA;
			normalPoint = bodyB.vertices[anchorB].avg(bodyB.vertices[(anchorB - 1 + bodyB.vertices.length) % bodyB.vertices.length]);
		}
		contacts.push(...contactsA, ...contactsB);


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

		// TODO: add check to see if pushing to globalVectors is necessary
		World.globalVectors.push({ position: normalPoint, vector: new vec(normal) });
		World.globalPoints.push(...contacts.map(v => v.vertice));

		// Get local anchor points
		for (let cp of contacts) {
			let rA = cp.vertice.sub(incidentBody.parentNode.position);
			let rB = cp.vertice.sub(referenceBody.parentNode.position);
			cp.anchorA = rA.rotate(-incidentBody.parentNode.angle);
			cp.anchorB = rB.rotate(-referenceBody.parentNode.angle);
		}

		let manifoldId = Common.pairCommon(bodyA.id, bodyB.id);
		let manifold = {
			bodyA: incidentBody,
			bodyB: referenceBody,
			anchorA: incidentBody.vertices[incidentBody === bodyA ? anchorA : anchorB],
			anchorB: referenceBody.vertices[referenceBody === bodyA ? anchorA : anchorB],

			depth: depth,
			penetration: normal.mult(depth),
			contacts: contacts,
			normal: normal,
			tangent: normal.normal(),

			friction: Math.sqrt(referenceBody.parentNode.friction ** 2 + incidentBody.parentNode.friction ** 2),
			restitution: 1 + Math.max(referenceBody.parentNode.restitution, incidentBody.parentNode.restitution),

			id: manifoldId,
			frame: Performance.frame,
			start: World.time,
		}

		if (World.pairs[manifoldId]) { // Collision happened last frame, so it's active
			let existingManifold = World.pairs[manifoldId];
			existingManifold.anchorA = manifold.anchorA;
			existingManifold.anchorB = manifold.anchorB;
			existingManifold.depth = manifold.depth;
			existingManifold.penetration = manifold.penetration;
			existingManifold.contacts = manifold.contacts;
			existingManifold.normal = manifold.normal;
			existingManifold.tangent = manifold.tangent;
			existingManifold.frame = manifold.frame;

			bodyA.parentNode.trigger("bodyInside", bodyB.parentNode, existingManifold);
			bodyB.parentNode.trigger("bodyInside", bodyA.parentNode, existingManifold);
		}
		else { // No collision between these bodies last frame, so collision just started
			bodyA.parentNode.trigger("bodyEnter", bodyB.parentNode, manifold);
			bodyB.parentNode.trigger("bodyEnter", bodyA.parentNode, manifold);
			
			bodyA.pairs.push(manifoldId);
			bodyB.pairs.push(manifoldId);
		}

		World.pairs[manifoldId] = manifold;
	}
	/**
	 * @private
	 * @param {CollisionShape} bodyA - Incident body, where the edge is
	 * @param {CollisionShape} bodyB - Reference body, where the collision point will likely be
	 * @returns {Array<*>} [contacts, minDepth, normal, vertice]
	 */
	#findNormal(bodyA, bodyB) {
		let contacts = [];
		let minDepth = Infinity;
		let overlapMargin = this.overlapMargin;
		let normal;
		let vertice = 0;

		let vertices = bodyA.vertices;
		for (let i = 0; i < vertices.length; i++) {
			let curVertice = vertices[i];
			let nextVertice = vertices[(i + 1) % vertices.length];
			let curNormal = curVertice.sub(nextVertice).normal().normalize();
			let [ verticeIndex, depth ] = bodyB._getSupport(curNormal, curVertice);
			let containsPoint = bodyB.containsPoint(curVertice, overlapMargin);

			if (containsPoint) {
				contacts.push({
					vertice: curVertice,
					incidentBody: bodyA,
					referenceBody: bodyB,

					normalImpulse: 0,
					tangentImpulse: 0,
				});
			}

			if (depth < minDepth) {
				minDepth = depth;
				normal = curNormal.mult(-1);
				vertice = verticeIndex;
			}
		}

		return [contacts, minDepth, normal, vertice];
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

			// Trigger bodyExit event
			bodyA.trigger("bodyExit", bodyB, pair);
			bodyB.trigger("bodyExit", bodyA, pair);

			return true;
		}
		return false;
	}

	prepareContacts(delta, hertz) {
		let { pairs } = this.World;
		let pairsArr = Object.keys(pairs);
		for (let i = pairsArr.length; i--;) {
			let pair = pairs[pairsArr[i]];
			const { bodyA: collisionShapeA, bodyB: collisionShapeB, normal, tangent, contacts, depth: rawDepth } = pair;
			const depth = rawDepth;
			const bodyA = collisionShapeA.parentNode;
			const bodyB = collisionShapeB.parentNode;

			const { _inverseMass: mA, _inverseInertia : iA, position: positionA, velocity: velocityA, angle: angleA } = bodyA;
			const { _inverseMass: mB, _inverseInertia : iB, position: positionB, velocity: velocityB, angle: angleB } = bodyB;

			// Stiffer for dynamic vs static
			let contactHertz = (mA === 0 || mB === 0) ? 2 * hertz : hertz;
			
			for (let cp of contacts) {
				// warm starting, but that's not implemented yet
				cp.normalImpulse = 0;
				cp.tangentImpulse = 0;

				// Adjusted separation
				let rA = cp.anchorA.rotate(angleA);
				let rB = cp.anchorB.rotate(angleB);
				cp.adjustedSeparation = depth + rB.add(positionB).sub(rA.add(positionA)).dot(normal);

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
				let omega = 1 * 2 * Math.PI * contactHertz;
				let c = delta * omega * (2 * zeta + delta * omega);
				cp.biasCoefficient = omega / (2 * zeta + delta * omega);
				cp.impulseCoefficient = 1 / (1 + c);
				cp.massCoefficient = c * cp.impulseCoefficient;
			}
		}
	}
	/**
	 * Solves velocity constriants on current collision pairs
	 * Also clears collision pairs that are no longer valid (they haven't collided this frame)
	 */
	solveVelocity(useBias) {
		let { pairs } = this.World;
		let pairsArr = Object.keys(pairs);
		const inv_h = this.inverseDelta;
		const slop = this.slop;

		let mA, mB, iA, iB, wA, wB, vA, vB, angleA, angleB, anchorA, anchorB;
		
		for (let i = pairsArr.length; i--;) {
			let pair = pairs[pairsArr[i]];
			if (!pair || this.cleansePair(pair)) continue;

			const { bodyA: collisionShapeA, bodyB: collisionShapeB, normal, tangent, contacts, friction, restitution } = pair;
			const bodyA = collisionShapeA.parentNode;
			const bodyB = collisionShapeB.parentNode;

			if (contacts.length === 0) continue;
			if (bodyA.isSensor || bodyB.isSensor) continue;

			mA = bodyA._inverseMass;
			iA = bodyA._inverseInertia;
			wA = bodyA.angularVelocity;
			vA = new vec(bodyA.velocity);
			angleA = bodyA.angle;
			
			mB = bodyB._inverseMass;
			iB = bodyB._inverseInertia;
			wB = bodyB.angularVelocity;
			vB = new vec(bodyB.velocity);
			angleB = bodyB.angle;

			for (let i = contacts.length; i--;) {
				let contact = contacts[i];
				anchorA = contact.anchorA;
				anchorB = contact.anchorB;

				const rA = anchorA.rotate(angleA); // radius vector A
				const rB = anchorB.rotate(angleB); // radius vector B

				// Relative velocity
				const vrA = bodyA.velocity.add(rA.cross(bodyA.angularVelocity));
				const vrB = bodyB.velocity.add(rB.cross(bodyB.angularVelocity));
				const vn = vrB.sub(vrA).dot(normal);
				const vt = vrB.sub(vrA).dot(tangent);

				// if (vn < 0) continue;

				// Separation
				const ds = bodyB.velocity.sub(bodyA.velocity).add(rB.sub(rA));
				let s = ds.dot(normal) * this.delta + contact.adjustedSeparation; // separation scalar
				s = (Math.abs(s) - slop) * Math.sign(s); // maintain a little separation
				if (s < 0) continue;
				

				// Impulse scale, effective mass (meff), and bias (baumgarte stabilization)
				let bias = 0;
				let massScale = 1;
				let impulseScale = 0;
				const maxBaumgarteVelocity = 100;
				if (s < 0) {
					bias = s * inv_h; // Speculative
				}
				else if (useBias) {
					bias = Math.min(contact.biasCoefficient * s, maxBaumgarteVelocity);
					massScale = contact.massCoefficient;
					impulseScale = contact.impulseCoefficient;
				}

				if (bodyA.isStatic || bodyB.isStatic) {
					bias *= 2;
				}
				
				// console.log(contact.normalMass);
				let normalImpulse = contact.normalMass * contact.massCoefficient * (vn * restitution + bias);// - impulseScale * contact.normalImpulse;
				let tangentImpulse = -contact.tangentMass * vt;
				
				// Clamp normal impulse
				if (false) { // Clamping current impulse rather than accumulated is more stable
					// Clamp accumulated impulse
					let newImpulse = Math.max(contact.normalImpulse + normalImpulse, 0);
					normalImpulse = newImpulse - contact.normalImpulse;
					contact.normalImpulse = newImpulse;
				}
				else {
					// Clamp current impulse
					normalImpulse = Math.max(normalImpulse, 0);
					contact.normalImpulse += normalImpulse;
				}

				// Clamp friction impulse
				if (false) {
					// Clamp accumulated impulse
					const maxFriction = friction * contact.normalImpulse;
					let newImpulse = Common.clamp(contact.tangentImpulse + tangentImpulse, -maxFriction, maxFriction);
					tangentImpulse = newImpulse - contact.tangentImpulse;
					contact.tangentImpulse = newImpulse;
				}
				else {
					// Clamp current impulse
					const maxFriction = friction * normalImpulse;
					tangentImpulse = Common.clamp(tangentImpulse, -maxFriction, maxFriction);
					contact.tangentImpulse += tangentImpulse;
				}
				
				// Apply contact impulse
				let P = normal.mult(normalImpulse).sub2(tangent.mult(tangentImpulse));

				vA.add2(P.mult(mA));
				wA += iA * rA.cross(P);

				vB.sub2(P.mult(mB));
				wB -= iB * rB.cross(P);
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
	 * Prepares contacts for position solver
	 */
	preSolvePosition() {
		const { World } = this;
		let { pairs } = World;
		let pairsArr = Object.keys(pairs);
		for (let i = pairsArr.length; i--;) {
			let pair = pairs[pairsArr[i]];
			let contacts = pair.contacts.length;
			pair.bodyA.parentNode.totalContacts += contacts;
			pair.bodyB.parentNode.totalContacts += contacts;
		}
	}
	/**
	 * Solves position intersections between bodies based on their collision pairs
	 */
	solvePosition() {
		const { World, slop, positionDampen } = this;
		let { pairs } = World;
		let pairsArr = Object.keys(pairs);

		for (let i = pairsArr.length; i--;) {
			let pair = pairs[pairsArr[i]];
			let { bodyA: collisionShapeA, bodyB: collisionShapeB, normal, anchorA, anchorB } = pair;
			let depth = pair.depth = anchorB.sub(anchorA).dot(normal);
			if (depth < 0) continue;
			let bodyA = collisionShapeA.parentNode;
			let bodyB = collisionShapeB.parentNode;
			if (bodyA.isSensor || bodyB.isSensor) continue;

			let seperation = depth + normal.dot(bodyB.positionImpulse.sub(bodyA.positionImpulse));
			if (seperation < 0) continue;
			
			let impulse = Math.max(seperation - slop, 0);
			if (bodyA.isStatic || bodyB.isStatic)
				impulse *= 2;
			
			if (!bodyA.isStatic) {
				let contactShare = positionDampen / bodyA.totalContacts;
				bodyA.positionImpulse.add2(normal.mult( impulse * contactShare));
			}
			if (!bodyB.isStatic) {
				let contactShare = positionDampen / bodyB.totalContacts;
				bodyB.positionImpulse.add2(normal.mult(-impulse * contactShare));
			}
		}
	}

	/**
	 * Cleans up after position solver
	 */
	postSolvePosition() {
		const { World, positionWarming } = this;
		let { rigidBodies } = World;
		for (let body of rigidBodies) {
			body.totalContacts = 0;

			let { positionImpulse, velocity } = body;
			if (positionImpulse.x !== 0 || positionImpulse.y !== 0) {
				body.translate(positionImpulse);
			}

			if (positionImpulse.dot(velocity) < 0) {
				positionImpulse.x = 0;
				positionImpulse.y = 0;
			}
			else {
				// warm start next iteration
				positionImpulse.mult2(positionWarming);
			}
		}
	}
};
module.exports = Engine;
