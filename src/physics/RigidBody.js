const vec = require("../geometry/vec.js");
const Node = require("../node/Node.js");
const Common = require("../core/Common.js");
const decomp = require("../lib/poly-decomp.js");

module.exports = class RigidBody extends Node {
	static defaultOptions = { // not used, but consistent with other classes for documentation
		mass: 1,
		restitution: 0.5,
		frictionAir: 0.05,
		frictionAngular: 0.01,
		friction: 0.01,
		round: 0,
	
		isStatic: false,
		isSensor: false,
		hasCollisions: true,
		collisionFilter: {
			layer: 0,
			mask: 0,
		},
	}
	static roundVertices(vertices, round, dx = 40) {
		let newVertices = [];
		let verticesLength = vertices.length;
		for (let i = 0; i < verticesLength; i++) {
			let prev = vertices[(i - 1 + verticesLength) % verticesLength];	
			let cur = vertices[i];	
			let next = vertices[(i + 1) % verticesLength];	

			// get vectors
			let prevToCur = cur.sub(prev);
			let curToNext = next.sub(cur);
			let prevCurNormalized = prevToCur.normalize();
			let curNextNormalized = curToNext.normalize();

			// get round amount
			let prevRound = Math.min(round, prevToCur.length / 2);
			let nextRound = Math.min(round, curToNext.length / 2);
			let curRound = Math.min(prevRound, nextRound);

			let start = prevCurNormalized.mult(-curRound).add(cur);
			let cp1 = prevCurNormalized.mult(-curRound * 0.45).add(cur);
			let cp2 = curNextNormalized.mult(curRound *  0.45).add(cur);
			let end = curNextNormalized.mult(curRound).add(cur);
			let bezier = new Bezier(start, cp1, cp2, end);
			for (let i = 0; i < bezier.length;) {
				newVertices.push(bezier.get(i));
				i += dx;
			}
			newVertices.push(end);
		}
		return newVertices;
	}

	//
	// Public user options
	//
	vertices = [];

	mass = 1;
	restitution = 0.5;
	frictionAir = 0.05;
	frictionAngular = 0.01;
	friction = 0.01;
	round = 0;

	isStatic = false;
	isSensor = false;
	hasCollisions = true;
	collisionFilter = {
		layer: 0,
		mask: 0,
	}

	constructor(type, vertices, position, Engine, options = {}) {
		this.type = type;
		this.Engine = Engine;

		// Merge options with body
		Common.merge(this, options);
		
		// Parse collision filter properties
		for (let filterType in ["layer", "mask"]) {
			if (typeof this.collisionFilter[filterType] === "string") {
				this.collisionFilter[filterType] = parseInt(this.collisionFilter[filterType], 2);
			}
		}

		// Convert vertices to vec
		this.vertices = vertices.map(v => new vec(v));
		
		// round vertices
		if (options.round && options.round > 0) {
			this.vertices = Body.roundVertices(this.vertices, this.round, this.roundQuality);
		}

		// Reset vertices so convex check works properly
		this.#removeDuplicateVertices();
		this._resetVertices(false);

		// Dissect into convex polygons if concave
		if (!this.#isConvex() && (!Array.isArray(options.children) || options.children.length === 0)) {
			options.children = [];

			let decompVerts = this.vertices.map(v => [v.x, v.y]);
			decomp.makeCCW(decompVerts);
			let concaveVertices = decomp.quickDecomp(decompVerts);
			let parentCenter = Common.getCenterOfMass(this.vertices);
			for (let i = 0; i < concaveVertices.length; i++) {
				let vertices = concaveVertices[i].map(v => new vec(v[0], v[1]));
				let center = Common.getCenterOfMass(vertices);
				let body = new FromVertices(vertices, position.add(center).sub(parentCenter), {
					isSensor: this.isSensor,
					isStatic: this.isStatic,
					hasCollisions: this.hasCollisions,
				});
				body._resetVertices(true);
				body.#makeConvex();
				
				options.children.push(body);
			}
		}

		// Shallow copy children in options into body
		let children = options.children;
		this.children = [];
		if (Array.isArray(children)) {
			for (let i = 0; i < children.length; i++) {
				let child = children[i];
				child.delete();
				child.parent = this;
				this.children.push(child);
			}
		}

		// Fully reset vertices
		this._resetVertices();
		this._updateInertia();

		// Set angle from options
		if (options.angle) {
			this.angle = 0;
			this.setAngle(-options.angle);
		}
	}
	
	//
	// Public user methods
	//
	/**
	 * Adds the body to its world
	 * @returns {void}
	 */
	add() {
		let World = this.Engine.World;
		if (!this.added) {
			super.add();
			World.addChild(this);
		}
	}

	/**
	 * Removes the body from its world
	 * @returns {void}
	 */
	delete() {
		let World = this.Engine.World;
		if (this.added) {
			super.delete();
			World.removeChild(this);

			for (let i = 0; i < this.pairs.length; i++) {
				this.Engine.cleansePair(this.pairs[i]);
			}
		}
	}
	
	/**
	 * Changes if the body is static
	 * @param {Boolean} isStatic - If the body should be static
	 * @returns {void}
	 */
	setStatic(isStatic) {
		let { dynamicGrid, staticGrid } = this.Engine.World;
		let lastStatic = this.isStatic;
		if (isStatic === lastStatic) return;
		
		this.isStatic = isStatic;

		if (this.hasCollisions && !this.removed) {
			if (lastStatic) {
				staticGrid.removeBody(this);
			}
			else {
				dynamicGrid.removeBody(this);
			}

			if (isStatic) {
				staticGrid.addBody(this);
			}
			else {
				dynamicGrid.addBody(this);
			}
		}
	}

	/**
	 * Changes if the body can collide with other bodies
	 * @param {Number} hasCollisions - Whether the body can collide with other bodies
	 * @returns {void}
	 */
	setCollisions(hasCollisions) {
		let { dynamicGrid, staticGrid } = this.Engine.World;
		if (hasCollisions === this.hasCollisions) return;

		this.hasCollisions = hasCollisions;

		if (this.hasCollisions) {
			if (this.isStatic) {
				staticGrid.addBody(this);
			}
			else {
				dynamicGrid.addBody(this);
			}
		}
		else {
			if (this.isStatic) {
				staticGrid.removeBody(this);
			}
			else {
				dynamicGrid.removeBody(this);
			}
		}
	}

	/**
	 * Finds if a point is inside the body
	 * @param {vec} point The point to query
	 * @returns {Boolean} If the point is inside the body's vertices
	 */
	containsPoint(point) {
		let vertices = this.vertices;
		for (let i = 0; i < vertices.length; i++) {
			let curVertice = vertices[i];
			let nextVertice = vertices[(i + 1) % vertices.length];
			
			if ((point.x - curVertice.x) * (nextVertice.y - curVertice.y) + (point.y - curVertice.y) * (curVertice.x - nextVertice.x) >= 0) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Instantly sets body's position to `position`
	 * @param {vec} position - The position the body should be
	 * @param {Boolean} _ignoreChildren - If the body's children should be affected
	 * @example
	 * body.setPosition(new vec(100, 100)); // Sets the body's position to (100, 100) 
	 * @returns {void}
	 */
	setPosition(position, _ignoreChildren = false) {
		let delta = position.sub(this.position);
		this.translate(delta, true, _ignoreChildren);
	}
	
	/**
	 * Shifts body's position by delta
	 * @param {vec} delta - Distance the body should be shifted
	 * @param {Boolean} affectPosition - If the body's position should be affected
	 * @param {Boolean} ignoreChildren - If the body's children should be shifted as well
	 * @returns {void}
	 */
	translate(delta, affectPosition = true, ignoreChildren = false) {
		if (delta.isNaN()) return;
		let vertices = this.vertices;
		for (let i = 0; i < vertices.length; i++) {
			vertices[i].add2(delta);
		}

		if (affectPosition) {
			this.position.add2(delta);
		}
		this.#updateBounds();

		let tree = this.world.dynamicGrid;
		if (this._Grids && this._Grids[tree.id]) {
			tree.updateBody(this);
		}

		if (!ignoreChildren) {
			let children = this.children;
			for (let i = 0; i < children.length; i++) {
				let child = children[i];
				child.translate(delta, affectPosition);
			}
		}
	}

	/**
	 * Rotates the body to `angle` - Absolute
	 * @param {Number} angle - Angle body should be in radians
	 * @example
	 * body.setAngle(Math.PI); // Sets the body's angle to Pi radians, or 180 degrees 
	 * @returns {void}
	 */
	setAngle(angle) {
		if (isNaN(angle)) return;
		if (angle !== this.angle) {
			let delta = Common.angleDiff(angle, this.angle);
			
			this.translateAngle(delta);
		}
	}

	/**
	 * Rotates the body by `angle`- Relative
	 * @param {Number} angle - The amount the body should be rotated, in radians
	 * @param {Boolean} silent - If the body's angle should be affected
	 * @returns {void}
	 */
	translateAngle(angle, silent = false) {
		if (isNaN(angle)) return;
		let vertices = this.vertices;
		let position = this.position;
		let rotationPoint = this.rotationPoint.rotate(this.angle + angle);
		if (this.parent) {
			rotationPoint.add2(this.position.sub(this.parent.position));
		}
		let sin = Math.sin(angle);
		let cos = Math.cos(angle);

		for (let i = vertices.length; i-- > 0;) {
			let vert = vertices[i];
			let dist = vert.sub(position);
			vert.x = position.x + (dist.x * cos - dist.y * sin);
			vert.y = position.y + (dist.x * sin + dist.y * cos);
		}

		let posOffset = rotationPoint.sub(rotationPoint.rotate(angle));
		this.translate(posOffset);
		if (!silent) {
			this.angle += angle;
		}

		this.#updateBounds();
		this.#updateAxes();

		let children = this.children;
		for (let i = 0; i < children.length; i++) {
			let child = children[i];
			child.translateAngle(angle, silent);
		}
	}

	/**
	 * Instantly changes the body's velocity to a specific value
	 * @param {vec} velocity - The velocity the body should have
	 * @returns {void}
	 */
	setVelocity(velocity) {
		if (velocity.isNaN()) {
			console.error(velocity);
			throw new Error("Invalid velocity");
		}
		if (this.isStatic) return;
		this.velocity.set(velocity);
	}

	/**
	 * Instantly changes the body's angular velocity to a specific value
	 * @param {vec} velocity - The angular velocity the body should have
	 * @returns {void}
	 */
	setAngularVelocity(velocity) {
		if (velocity.isNaN()) {
			console.error(velocity);
			throw new Error("Invalid angular velocity");
		}
		if (this.isStatic) return;
		this.angularVelocity = velocity;
	}

	/**
	 * Applies a force to the body, ignoring mass. The body's velocity changes by force * delta
	 * @param {vec} force - The amount of force to be applied, in px / sec^2
	 * @param {Number} delta - The amount of time that the force should be applied in seconds, set to 1 if only applying in one instant
	 * @returns {void}
	 */
	applyForce(force, delta = Engine.delta) { // set delta to 1 if you want to apply a force for only 1 frame
		if (force.isNaN()) return;
		if (this.isStatic) return;
		this.force.add2(force.mult(delta));
	}
	
	/**
	 * Applies a rotational force (torque) to the body, ignoring mass. The body's angular velocity changes by force * delta
	 * @param {Number} force - The amount of torque to be applied, in radians / sec^2
	 * @param {Number} delta - The amount of time the force should be applied in seconds, set to 1 if only applying instantaneous force
	 * @returns 
	 */
	applyTorque(force, delta = Engine.delta) { // set delta to 1 if you want to apply a force for only 1 frame
		if (isNaN(force)) return;
		this.torque += force * delta;
	}

	// 
	// Private engine variables
	// 
	Engine = null;
	parent = null;

	position = new vec(0, 0);
	velocity = new vec(0, 0);
	angle = 0;
	angularVelocity = 0;
	_last = {
		velocity: new vec(0, 0),
		angularVelocity: 0,
	};

	force = new vec(0, 0);
	impulse = new vec(0, 0);
	torque = 0;

	axes = [];

	_inverseMass = 1;
	inertia = 1;
	_inverseInertia = 0.000015;	

	pairs = [];
	_lastSeparations = {};
	_slop = 0.001;

	bounds = {
		min: new vec({ x: 0, y: 0 }),
		max: new vec({ x: 1, y: 1 })
	}

	#events = {
		collisionStart: [],
		collisionActive: [],
		collisionEnd: [],
		beforeUpdate: [], // use to apply forces to current body
		duringUpdate: [], // use to clear forces from current body
		delete: [],
		add: [],
	}

	// 
	// Private engine methods
	// 
	/**
	 * Prepares the body 
	 * @param {Number} delta - Engine tick duration, in seconds
	 * @returns {void}
	 */
	_preUpdate(delta) {
		this.trigger("beforeUpdate");

		if (this.isStatic) return;

		// apply forces
		this.velocity.add2(this.force).add2(ter.World.gravity.mult(delta));
		this.angularVelocity += this.torque;

		// clear forces
		this.force.x = 0;
		this.force.y = 0;
		this.torque = 0;
	}
	/**
	 * Updates this body's velocity, position, and grid
	 * @param {Number} delta - Engine tick duration, in seconds
	 * @returns {void}
	 */
	_update(delta) {
		if (this.isStatic) return;

		if (!this.parent) {
			const timescale = delta;
			let { velocity: lastVelocity, angularVelocity: lastAngularVelocity } = this._last;

			let frictionAir = (1 - this.frictionAir) ** timescale;
			let frictionAngular = (1 - this.frictionAngular) ** timescale;

			if (isNaN(timescale) || this.velocity.isNaN() || isNaN(frictionAir + frictionAngular)) {
				return;
			}
			
			this.velocity.mult2(frictionAir);
			if (this.velocity.x !== 0 || this.velocity.y !== 0){
				this.translate(this.velocity.add(lastVelocity).mult(timescale / 2)); // trapezoidal rule to take into account acceleration
				// body.translate(body.velocity.mult(timescale)); // potentially more stable, but less accurate
			}
			this._last.velocity.set(this.velocity);

			this.angularVelocity *= frictionAngular;
			if (this.angularVelocity){
				this.translateAngle((this.angularVelocity + lastAngularVelocity) * timescale / 2); // trapezoidal rule to take into account acceleration
				// body.translateAngle((body.angularVelocity) * timescale); // potentially more stable, but less accurate
			}
			this._last.angularVelocity = this.angularVelocity;
			
			this.updateBounds();
		}
		if (this.children.length === 0 && this.hasCollisions) {
			this.Engine.World.dynamicGrid.updateBody(this);
		}
	}

	/**
	 * Calculates the area of the body if it is convex
	 * @returns {Number} The area of the body
	 */
	#getArea() {
		let area = 0;
		let vertices = this.vertices;
		let len = vertices.length;
		for (let i = 0; i < len; i++) {
			area += vertices[i].cross(vertices[(i + 1) % len]);
		}
		return area * 0.5;
	}

	/**
	 * Calculates inertia from the body's vertices
	 * @returns {Number} The body's inertia
	 */
	#getInertia() {
		let children = this.children;
		if (children.length === 0) {
			const { vertices, mass } = this;
			
			let numerator = 0;
			let denominator = 0;
	
			for (var i = 0; i < vertices.length; i++) {
				let j = (i + 1) % vertices.length;
				let cross = Math.abs(vertices[j].cross(vertices[i]));
				numerator += cross * (vertices[j].dot(vertices[j]) + vertices[j].dot(vertices[i]) + vertices[i].dot(vertices[i]));
				denominator += cross;
			}
	
			return (mass / 6) * (numerator / denominator);
		}
		else {
			let inertia = 0;

			for (let i = 0; i < children.length; i++) {
				let child = children[i];
				inertia += child.inertia;
			}

			return inertia;
		}
	}
	/**
	 * Sets the inertia of the body to what's calculated in `#getInertia()` if the body is not static
	 * @returns {void}
	 */
	_updateInertia() {
		if (this.isStatic) {
			this.mass = Infinity;
			this._inverseMass = 0;
		}
		else {
			this.inertia = this.#getInertia();
			this._inverseInertia = 1 / this.inertia;
		}
	}

	/**
	 * Removes overlapping vertices
	 * @param {Number} minDist - Minimum distance when points are considered the same
	 * @returns {void}
	 */
	#removeDuplicateVertices(minDist = 1) { // remove vertices that are the same
		let vertices = this.vertices;
		for (let i = 0; i < vertices.length; i++) {
			let curVert = vertices[i];
			
			for (let j = 0; j < vertices.length; j++) {
				if (j === i) continue;
				let nextVert = vertices[j];
				let dist = curVert.sub(nextVert);

				if (Math.abs(dist.x) + Math.abs(dist.y) < minDist) { // just use manhattan dist because it doesn't really matter
					vertices.splice(i, 1);
					i--;
					break;
				}
			}
		}
	}

	/**
	 * Determines if the body is convex
	 * @returns {Boolean} If the body is convex
	 */
	#isConvex() {
		let vertices = this.vertices;
		let len = vertices.length;

		let last = vertices[0].sub(vertices[1]);
		let sign = 0;
		for (let i = 1; i < len; i++) {
			let cur = vertices[i].sub(vertices[(i + 1) % len]);
			let curSign = Math.sign(cur.cross(last));

			if (sign === 0) {
				sign = curSign;
			}
			else if (curSign !== 0) {
				if (sign !== curSign) {
					return false;
				}
			}
			last = cur;
		}

		return true;
	}

	/**
	 * Decomposes a concave body into convex children
	 * @returns {void}
	 */
	#makeConvex() {
		if (!this.#isConvex()) {
			let added = this.added;
			this.delete();
			
			let { vertices, position } = this;
			this.children = [];
			let verts = vertices.map(v => [v.x, v.y]);
			decomp.removeCollinearPoints(verts, 0.4);
			let concaveVertices = decomp.quickDecomp(verts);
			let parentCenter = Common.getCenterOfMass(this.vertices);

			for (let i = 0; i < concaveVertices.length; i++) {
				let vertices = concaveVertices[i].map(v => new vec(v[0], v[1]));
				let center = Common.getCenterOfMass(vertices);
				let body = new FromVertices(vertices, position.add(center).sub(parentCenter));
				body.delete();
				body.parent = this;
				this.addChild(body);
			}

			if (added) {
				this.add();
			}
		}
	}

	/**
	 * Calculates the body's axes from its vertices
	 */
	#updateAxes() {
		let verts = this.vertices;
		let axes = [];

		for (let i = 0; i < verts.length; i++) {
			let curVert = verts[i];
			let nextVert = verts[(i + 1) % verts.length];

			axes.push(nextVert.sub(curVert));
		}
		for (let i = 0; i < axes.length; i++) {
			axes[i] = axes[i].normal().normalize2();
		}

		this._axes = axes;
	}

	/**
	 * Shifts vertices so their center is at the body's position 
	 */
	#recenterVertices() {
		let center = Common.getCenterOfMass(this.vertices);
		let position = this.position;
		center.sub2(position);
		
		for (let i = 0; i < this.vertices.length; i++) {
			this.vertices[i].sub2(center);
		}
	}

	/**
	 * Finds the minimum bounds that enclose the body
	 */
	#updateBounds() {
		const vertices = this.vertices;
		let minX = Infinity, minY = Infinity;
		let maxX = -Infinity, maxY = -Infinity;

		for (let i = 0; i < vertices.length; i++) {
			let v = vertices[i];

			if (v.x < minX) minX = v.x;
			if (v.x > maxX) maxX = v.x;
			if (v.y < minY) minY = v.y;
			if (v.y > maxY) maxY = v.y;
		}

		this.bounds.min.x = minX;
		this.bounds.min.y = minY;
		this.bounds.max.x = maxX;
		this.bounds.max.y = maxY;
	}

	/**
	 * Ensures vertices are counterclockwise winding and centered, and updates the area, bounding box, and the axes
	 * @param {Number} forceCCW - If vertices should be forced to be counterclockwise winding by sorting their angles from the center
	 */
	_resetVertices(forceCCW = false) {
		this.#makeCCW(forceCCW);
		this.area = this.#getArea();
		this.#recenterVertices();
		this.#updateBounds();
		this.#updateAxes();
	}

	/**
	 * Tries to ensure the body's vertices are counterclockwise winding, by default by comparing the angles of the first 2 vertices and reversing the vertice array if they're clockwise
	 * @param {Boolean} force - If all vertices should be completely reordered using their angle from the center 
	 */
	#makeCCW(force = false) { // makes vertices go counterclockwise if they're clockwise
		if (force) { // reorders vertices by angle from center - can change order of vertices
			let vertices = this.vertices;
			let center = this.position;
			let mapped = vertices.map(v => [v, v.sub(center).angle]);
			mapped.sort((a, b) => Common.angleDiff(a[1], b[1]));
			this.vertices = mapped.map(v => v[0]);
		}
		else { // reverses vertices if the 1st and 2nd are going wrong direction - never changes order of vertices
			let vertices = this.vertices;
			let center = this.position;
	
			let mapped = vertices.map(v => v.sub(center).angle);
			if (Common.angleDiff(mapped[0], mapped[1]) > 0) {
				this.vertices.reverse();
			}
		}
	}

	/**
	 * Finds the vertice farthest in a direction
	 * @param {vec} vector - The normalized direction to find the support point
	 * @returns {Array} 
	 */
	_getSupport(vector) {
		let vertices = this.vertices;
		let bestDist = 0;
		let bestVert;
		for (let i = 0; i < vertices.length; i++) {
			let dist = vector.dot(vertices[i]);

			if (dist > bestDist) {
				bestDist = dist;
				bestVert = i;
			}
		}

		return [ bestVert, bestDist ];
	}
}
