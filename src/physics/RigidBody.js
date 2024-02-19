const vec = require("../geometry/vec.js");
const Node = require("../node/Node.js");
const Common = require("../core/Common.js");
const PolygonRender = require("../render/PolygonRender.js");
const Sprite = require("../render/Sprite.js");
const Bezier = require("../geometry/Bezier.js");
const Bounds = require("../geometry/Bounds.js");

/**
 * @class RigidBody
 * @description A rigid body with physics
 * @extends Node
 */
module.exports = class RigidBody extends Node {
	/**
	 * Default RigidBody options
	 */
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
			layer: 0xFFFFFF,
			mask: 0xFFFFFF,
		},
	}
	/**
	 * Rounds corners on an array of vertices
	 * @param {Array} vertices - Array of `vec` vertices to round
	 * @param number round - Amount of rounding
	 * @param number dx - Quality of round, lower value means higher quality
	 * @returns {void}
	 */
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
		layer: 0xFFFFFF,
		mask: 0xFFFFFF,
	}

	/**
	 * @description Creates a new RigidBody
	 * @param {Array} vertices Array of `vec` representing the body's vertices
	 * @param {vec} position - The position of the body
	 * @param {Engine} Engine - The engine the body should be simulated in
	 * @param {Object} options - RigidBody options, see documentation for options
	 */
	constructor(Engine, vertices, position, options = {}) {
		super();
		if (!this.Engine) this.Engine = Engine;
		
		// Shallow copy World
		this.World = this.Engine.World;
		delete options.World;

		// Shallow copy render
		if (options.render) {
			this.addChild(options.render);
			delete options.render;
		}

		// Merge collision filters
		if (typeof options.collisionFilter === "object") Common.merge(this.collisionFilter, options.collisionFilter, 1);

		// Merge options with body
		Common.merge(this, options, 1);
		
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
			this.vertices = RigidBody.roundVertices(this.vertices, this.round, this.roundQuality);
		}

		// Create bounds
		this.bounds = new Bounds(this.vertices);

		// Reset vertices so convex check works properly
		this.#removeDuplicateVertices();
		this._resetVertices(false);

		// Fully reset vertices
		this._resetVertices();
		this._updateInertia();

		// Set angle from options
		if (options.angle) {
			this.angle = 0;
			this.setAngle(-options.angle);
		}
		this.setPosition(position);
	}
	
	//
	// Public user methods
	//
	/**
	 * @description Adds the body to its world
	 * @returns {RigidBody} `this`
	 */
	add() {
		let World = this.Engine.World;
		if (!this.added) {
			super.add();
			World.addChild(this);
		}
		return this;
	}

	/**
	 * @description Removes the body from its world
	 * @returns {RigidBody} `this`
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
		return this;
	}

	/**
	 * @method addPolygonRender
	 * @description Adds a polygon render to body
	 * @param {PIXI.Container} container - Container polygon render is added to
	 * @param {Object} options - Options for polygon render, see documentation for possible options
	 * @returns {RigidBody} `this`
	 */
	addPolygonRender(container, options) {
		let render = new PolygonRender({
			container: container,
			position: new vec(this.position),
			vertices: this.vertices,
			
			...options
		});
		if (this.added) render.add();
		this.addChild(render);
		
		return this;
	}

	/**
	 * @method addSprite
	 * @description Adds a sprite to body
	 * @param {PIXI.Container} container - Container polygon render is added to
	 * @param {Object} options - Sprite options, see documentation for possible options
	 * @returns {RigidBody} `this`
	 */
	addSprite(container, options) {
		let render = new Sprite({
			container: container,
			position: new vec(this.position),
			
			...options
		});
		if (this.added) render.add();
		this.addChild(render);
		
		return this;
	}
	
	/**
	 * @description Changes if the body is static
	 * @param {boolean} isStatic - If the body should be static
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
	 * @description Changes if the body can collide with other bodies
	 * @param number hasCollisions - Whether the body can collide with other bodies
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
	 * @description Finds if a point is inside the body
	 * @param {vec} point The point to query
	 * @returns {boolean} If the point is inside the body's vertices
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
	 * @description Instantly sets body's position to `position`
	 * @param {vec} position - The position the body should be
	 * @param {boolean} _ignoreChildren - If the body's children should be affected
	 * @example
	 * body.setPosition(new vec(100, 100)); // Sets body's position to (100, 100) 
	 * @returns {void}
	 */
	setPosition(position, _ignoreChildren = false) {
		let delta = position.sub(this.position);
		this.translate(delta, true, _ignoreChildren);
	}
	
	/**
	 * @description Shifts body's position by delta
	 * @param {vec} delta - Distance the body should be shifted
	 * @param {boolean} affectPosition - If the body's position should be affected
	 * @param {boolean} ignoreChildren - If the body's children should be shifted as well
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
		this.bounds.update(this.vertices);

		let tree = this.Engine.World.dynamicGrid;
		if (this._Grids && this._Grids[tree.id]) {
			tree.updateBody(this);
		}

		if (!ignoreChildren) {
			let children = this.children;
			for (let child of children) {
				child.translate(delta, affectPosition);
			}
		}
	}

	/**
	 * @description Rotates the body to `angle` - Absolute
	 * @param number angle - Angle body should be in radians
	 * @example
	 * body.setAngle(Math.PI); // Sets body's angle to Pi radians, or 180 degrees 
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
	 * @description Rotates the body by `angle`- Relative
	 * @param number angle - The amount the body should be rotated, in radians
	 * @param {boolean} silent - If the body's angle should be affected
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

		this.bounds.update(this.vertices);
		this.#updateAxes();

		for (let child of this.children) {
			child.translateAngle?.(angle, silent);
		}
	}

	/**
	 * @description Instantly changes the body's velocity to a specific value
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
	 * @description Instantly changes the body's angular velocity to a specific value
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
	 * @description Applies a force to the body, ignoring mass. The body's velocity changes by force * delta
	 * @param {vec} force - The amount of force to be applied, in px / sec^2
	 * @param number delta - The amount of time that the force should be applied in seconds, set to 1 if only applying in one instant
	 * @returns {void}
	 */
	applyForce(force, delta = Engine.delta) { // set delta to 1 if you want to apply a force for only 1 frame
		if (force.isNaN()) return;
		if (this.isStatic) return;
		this.force.add2(force.mult(delta));
	}
	
	/**
	 * @description Applies a rotational force (torque) to the body, ignoring mass. The body's angular velocity changes by force * delta
	 * @param number force - The amount of torque to be applied, in radians / sec^2
	 * @param number delta - The amount of time the force should be applied in seconds, set to 1 if only applying instantaneous force
	 * @returns {void}
	 */
	applyTorque(force, delta = Engine.delta) { // set delta to 1 if you want to apply a force for only 1 frame
		if (isNaN(force)) return;
		this.torque += force * delta;
	}

	// 
	// Private engine variables
	// 
	nodeType = "RigidBody";
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
	center = new vec(0, 0);
	torque = 0;
	
	_axes = [];
	rotationPoint = new vec(0, 0);

	_inverseMass = 1;
	inertia = 1;
	_inverseInertia = 0.000015;	

	pairs = [];
	_lastSeparations = {};
	_slop = 0.001;

	bounds = null;

	#events = {
		collisionStart: [],
		collisionActive: [],
		collisionEnd: [],

		bodyEnter: [],
		bodyInside: [],
		bodyExit: [],
		
		beforeUpdate: [], // use to apply forces to current body
		duringUpdate: [], // use to clear forces from current body
		delete: [],
		add: [],
	}

	// 
	// Private engine methods
	// 
	/**
	 * @private
	 * Prepares the body 
	 * @param number delta - Engine tick duration, in seconds
	 * @returns {void}
	 */
	_preUpdate(delta) {
		this.trigger("beforeUpdate");

		if (this.isStatic) return;

		// apply forces
		this.velocity.add2(this.force).add2(this.Engine.World.gravity.mult(delta));
		this.angularVelocity += this.torque;

		// clear forces
		this.force.x = 0;
		this.force.y = 0;
		this.torque = 0;
	}
	/**
	 * @private
	 * Updates this body's velocity, position, and grid
	 * @param number delta - Engine tick duration, in seconds
	 * @returns {void}
	 */
	_update(delta) {
		this.trigger("duringUpdate");

		if (this.isStatic) return;

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
		
		this.bounds.update(this.vertices);

		if (this.hasCollisions) {
			this.Engine.World.dynamicGrid.updateBody(this);
		}
	}

	/**
	 * @private
	 * Calculates the area of the body if it is convex
	 * @returns number The area of the body
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
	 * @private
	 * Calculates inertia from the body's vertices
	 * @returns number The body's inertia
	 */
	#getInertia() {
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
	/**
	 * @private
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
	 * @private
	 * Removes overlapping vertices
	 * @param number minDist - Minimum distance when points are considered the same
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
	 * @private
	 * Determines if the body is convex
	 * @returns {boolean} If the body is convex
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

	#getCenterOfMass() {
		let center = Common.getCenterOfMass(this.vertices);
		this.center.set(center);
		return center;
	}

	/**
	 * @private
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
	 * @private
	 * Shifts vertices so their center is at the body's position 
	 */
	#recenterVertices() {
		let center = this.#getCenterOfMass();
		let position = this.position;
		center.sub2(position);
		
		for (let i = 0; i < this.vertices.length; i++) {
			this.vertices[i].sub2(center);
		}
	}

	/**
	 * @private
	 * Ensures vertices are counterclockwise winding and centered, and updates the area, bounding box, and the axes
	 * @param number forceCCW - If vertices should be forced to be counterclockwise winding by sorting their angles from the center
	 */
	_resetVertices(forceCCW = false) {
		this.#makeCCW(forceCCW);
		this.area = this.#getArea();
		this.#recenterVertices();
		this.bounds.update(this.vertices);
		this.#updateAxes();
	}

	/**
	 * @private
	 * Tries to ensure the body's vertices are counterclockwise winding, by default by comparing the angles of the first 2 vertices and reversing the vertice array if they're clockwise
	 * @param {boolean} force - If all vertices should be completely reordered using their angle from the center 
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
	 * @private
	 * Finds the vertice farthest in a direction
	 * @param {vec} vector - Normalized direction to find the support point
	 * @param {vec} position - Position to base support on
	 * @returns {Array} 
	 */
	_getSupport(vector, position = this.position) {
		let vertices = this.vertices;
		let bestDist = 0;
		let bestVert;
		for (let i = 0; i < vertices.length; i++) {
			let dist = vector.dot(vertices[i].sub(position));

			if (dist > bestDist) {
				bestDist = dist;
				bestVert = i;
			}
		}

		return [ bestVert, bestDist ];
	}
}
