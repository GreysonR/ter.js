const vec = require("../geometry/vec.js");
const Node = require("../node/Node.js");
const Common = require("../core/Common.js");
const PolygonRender = require("../render/PolygonRender.js");
const Sprite = require("../render/Sprite.js");
const Bezier = require("../geometry/Bezier.js");
const CollisionShape = require("../physics/CollisionShape.js");
const decomp = require("poly-decomp");

/**
 * A rigid body with physics
 * @extends Node
 */
class RigidBody extends Node {
	static defaultOptions = { // not used, but consistent with other classes for documentation
		mass: 1,
		restitution: 0.5,
		frictionAir: 0.05,
		frictionAngular: 0.01,
		friction: 0.01,
		round: 0,
		roundQuality: 40,
	
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
	 * @param {number} round - Amount of rounding
	 * @param {number} dx - Quality of round, lower value means higher quality
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
	nodeType = "RigidBody";
	vertices = [];

	mass = 1;
	restitution = 0.5;
	frictionAir = 0.05;
	frictionAngular = 0.01;
	friction = 0.01;
	round = 0;
	roundQuality = 40;

	isStatic = false;
	isSensor = false;
	hasCollisions = true;
	collisionFilter = {
		layer: 0xFFFFFF,
		mask: 0xFFFFFF,
	}

	/**
	 * Creates a new RigidBody
	 * @param {Engine} Engine - Engine the body should be simulated in
	 * @param {Array} vertices - Array of `vec` representing the body's vertices
	 * @param {vec} position - Position of the body
	 * @param {Object} options - RigidBody options
	 * @example
	 * // Includes all RigidBody options
	 * new RigidBody(Engine, [new vec(0, 0), new vec(10, 0), new vec(10, 10), new vec(0, 10)], new vec(0, 0), {
	 * 	mass: 1,
	 * 	restitution: 0.5,
	 * 
	 * 	frictionAir: 0.05,
	 * 	frictionAngular: 0.01,
	 * 	friction: 0.01,
	 * 
	 * 	round: 0,
	 * 	roundQuality: 40,
	 * 
	 * 	isStatic: false,
	 * 	isSensor: false,
	 * 	hasCollisions: true,
	 * 	collisionFilter: {
	 * 		layer: 0xFFFFFF,
	 * 		mask: 0xFFFFFF,
	 * 	},
	 * });
	 */
	constructor(Engine, vertices, position, options = {}) {
		super();
		position = new vec(position);
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

		// Reset vertices so convex check works properly
		this.#removeDuplicateVertices();
		this._resetVertices();

		let allVertices = [this.vertices];
		if (!this.#isConvex()) {
			allVertices = this.#getConvexVertices();
		}

		for (let vertices of allVertices) {
			let collisionShape = new CollisionShape(this, vertices, this.Engine);
			this.addChild(collisionShape);
		}

		// Fully reset vertices
		this._resetVertices();
		this._updateInertia();

		// Set angle from options
		if (options.angle) {
			this.angle = 0;
			this.setAngle(options.angle);
		}
		this.setPosition(position);
	}
	
	//
	// Public user methods
	//
	/**
	 * Adds the collision shape to its world
	 * @return {RigidBody} `this`
	 */
	add() {
		let World = this.Engine.World;
		if (!this.isAdded()) {
			super.add();
			World.addChild(this);
		}
		return this;
	}

	/**
	 * Removes the collision shape from its world
	 * @return {RigidBody} `this`
	 */
	delete() {
		let World = this.Engine.World;
		if (this.isAdded()) {
			super.delete();
			World.removeChild(this);
		}
		return this;
	}

	/**
	 * Adds a polygon render to body
	 * @param {PIXI.Container} container - Container polygon render is added to
	 * @param {Object} options - (Polygon Render)[./PolygonRender.html] options
	 * @return {RigidBody} `this`
	 * @example
	 * body.addPolygonRender(Render.app.stage, {
	 * 	layer: 0, // number
	 * 	subtype: "polygon", // "polygon" | "rectangle" | "circle"
	 * 
	 * 	visible: true,
	 * 	alpha: 1,
	 * 	background: "transparent",
	 * 	border: "transparent",
	 * 	borderWidth: 3,
	 * 	borderOffset: 0.5,
	 * 	lineCap: "butt",
	 * 	lineJoin: "miter",
	 * 
	 * 	// subtype = "rectangle" only options
	 * 	width: 100,
	 * 	height: 100,
	 * 	round: 0,
	 * 
	 * 	// subtype = "circle" only options
	 * 	radius: 50,
	 * })
	 */
	addPolygonRender(container, options) {
		let render = new PolygonRender({
			container: container,
			position: new vec(this.position),
			vertices: this.vertices,
			angle: this.angle,
			
			...options
		});
		if (this.isAdded()) render.add();
		this.addChild(render);
		
		return this;
	}

	/**
	 * Adds a sprite to body
	 * @param {PIXI.Container} container - Container polygon render is added to
	 * @param {Object} options - (Sprite)[./Sprite.html] options
	 * @return {RigidBody} `this`
	 * @example
	 * body.addSprite(Render.app.stage, {
	 * 	layer: 0, // number
	 * 
	 * 	visible: true,
	 * 	alpha: 1, // number between [0, 1]
	 * 	src: "path/to/sprite.png",
	 * 	
	 * 	scale: new vec(1, 1),
	 * 	width:  undefined, // number
	 * 	height: undefined, // number
	 * });
	 */
	addSprite(container, options) {
		let render = new Sprite({
			container: container,
			position: new vec(this.position),
			angle: this.angle,
			
			...options
		});
		if (this.isAdded()) render.add();
		this.addChild(render);
		
		return this;
	}
	
	/**
	 * Changes if the body is static
	 * @param {boolean} isStatic - If the body should be static
	 */
	setStatic(isStatic) {
		let { dynamicGrid, staticGrid } = this.Engine.World;
		let lastStatic = this.isStatic;
		if (isStatic === lastStatic) return;
		
		this.isStatic = isStatic;
		this.mass = Infinity;
		this.inertia = Infinity;
		this._inverseMass = 0;
		this._inverseInertia = 0;

		if (this.hasCollisions && this.isAdded()) {
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
	 * @param {boolean} hasCollisions - Whether the body can collide with other bodies
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
	 * Finds if a point is inside the body's collision shapes
	 * @param {vec} point - Point to query
	 * @return {boolean} If the point is inside the body's vertices
	 */
	containsPoint(point) {
		for (let child of this.children) {
			if (child instanceof CollisionShape && child.containsPoint(point)) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Instantly sets body's position to `position`
	 * @param {vec} position - Position the body should be
	 * @example
	 * body.setPosition(new vec(100, 100)); // Sets body's position to (100, 100) 
	 */
	setPosition(position) {
		let delta = position.sub(this.position);
		this.translate(delta);
	}

	/**
	 * Instantly changes the body's velocity to a specific value
	 * @param {vec} velocity - Velocity the body should have
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
	 * @param {number} velocity - Angular velocity the body should have
	 */
	setAngularVelocity(velocity) {
		if (isNaN(velocity)) {
			console.error(velocity);
			throw new Error("Invalid angular velocity");
		}
		if (this.isStatic) return;
		this.angularVelocity = velocity;
	}

	/**
	 * Applies a force to the body, ignoring mass. The body's velocity changes by force * delta
	 * @param {vec} force - Amount of force to be applied, in px / sec^2
	 * @param {number} delta - Amount of time that the force should be applied in seconds, set to 1 if only applying in one instant
	 */
	applyForce(force, delta = this.Engine.delta) { // set delta to 1 if you want to apply a force for only 1 frame
		if (force.isNaN()) return;
		if (this.isStatic) return;
		this.force.add2(force.mult(delta));
	}
	
	/**
	 * Applies a rotational force (torque) to the body, ignoring mass. The body's angular velocity changes by force * delta
	 * @param {number} force - Amount of torque to be applied, in radians / sec^2
	 * @param {number} delta - Amount of time the force should be applied in seconds, set to 1 if only applying instantaneous force
	 */
	applyTorque(force, delta = this.Engine.delta) { // set delta to 1 if you want to apply a force for only 1 frame
		if (isNaN(force)) return;
		this.torque += force * delta;
	}

	// 
	// Private engine variables
	// 
	Engine;

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
	
	rotationPoint = new vec(0, 0);

	_inverseMass = 1;
	inertia = 1;
	_inverseInertia = 0.000015;	

	#events = {
		collisionStart: [],
		collisionActive: [],
		collisionEnd: [],

		bodyEnter: [],
		bodyInside: [],
		bodyExit: [],
		
		beforeUpdate: [], // use to apply forces to current body
		duringUpdate: [], // use to clear forces from current body
		
		add: [],
		delete: [],
	}
	/**
	 * Bind a callback to an event
	 * @param {string} event - Name of the event
	 * @param {Function} callback - Callback run when event is fired
	 */
	on(event, callback) {
		if (this.#events[event]) {
			this.#events[event].push(callback);
		}
		else {
			console.warn(event + " is not a valid event");
		}
	}
	/**
	 * Unbinds a callback from an event
	 * @param {string} event - Name of the event
	 * @param {Function} callback - Function to unbind
	 */
	off(event, callback) {
		let events = this.#events[event];
		if (events.includes(callback)) {
			events.splice(events.indexOf(callback), 1);
		}
	}
	/**
	 * Triggers an event, firing all bound callbacks
	 * @param {string} event - Name of the event
	 * @param {...*} args - Arguments passed to callbacks
	 */
	trigger(event, ...args) {
		// Trigger each event
		if (this.#events[event]) {
			this.#events[event].forEach(callback => {
				callback(...args);
			});
		}
	}

	// 
	// Private engine methods
	// 
	/**
	 * Prepares the body 
	 * @param {number} delta - Engine tick duration, in seconds
	 * @private
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
	 * Updates this body's velocity, position, and grid
	 * @param {number} delta - Engine tick duration, in seconds
	 * @private
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
		}
		this._last.velocity.set(this.velocity);

		this.angularVelocity *= frictionAngular;
		if (this.angularVelocity){
			this.translateAngle((this.angularVelocity + lastAngularVelocity) * timescale / 2); // trapezoidal rule to take into account acceleration
		}
		this._last.angularVelocity = this.angularVelocity;

		if (this.hasCollisions) {
			for (let child of this.children) {
				if (child instanceof CollisionShape) {
					this.Engine.World.dynamicGrid.updateBody(child);
				}
			}
		}
	}

	/**
	 * Calculates the area of the body if it is convex
	 * @return {number} The area of the body
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
	 * Removes overlapping vertices
	 * @param {number} minDist - Minimum distance when points are considered the same
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
	 * Calculates inertia from the body's vertices
	 * @return {number} The body's inertia
	 */
	#getInertia() {
		const { vertices, mass } = this;

		if (this.isStatic) return Infinity;
		
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
	 * Sets the inertia of the body to what's calculated in `#getInertia()` if the body is not static
	 * @private
	 */
	_updateInertia() {
		if (this.isStatic) {
			this.mass = Infinity;
			this.inertia = Infinity;
			this._inverseMass = 0;
			this._inverseInertia = 0;
		}
		else {
			this.inertia = this.#getInertia();
			this._inverseInertia = 1 / this.inertia;
		}
	}

	/**
	 * Determines if the body is convex
	 * @return {boolean} If the body is convex
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
	 * Decomposes concave vertices into convex shapes
	 * @returns {Array<vec>} set of convex shapes
	 */
	#getConvexVertices() {
		let convexShapes = [];
		let vertices = this.vertices;
		let decompVerts = vertices.map(v => v.toArray());
		decomp.makeCCW(decompVerts);
		let concaveVertices = decomp.quickDecomp(decompVerts);
		for (let i = 0; i < concaveVertices.length; i++) {
			convexShapes.push(concaveVertices[i].map(v => new vec(v)));
		}
		return convexShapes;
	}

	#getCenterOfMass() {
		let center = Common.getCenterOfMass(this.vertices);
		return center;
	}

	/**
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
	 * Ensures vertices are counterclockwise winding and centered, and updates the area, bounding box, and the axes
	 * @param {boolean} forceCCW - If vertices should be forced to be counterclockwise winding by sorting their angles from the center
	 * @private
	 */
	_resetVertices(forceCCW = false) {
		this.#makeCCW(forceCCW);
		this.area = this.#getArea();
		this.#recenterVertices();
	}

	/**
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

}
module.exports = RigidBody;
