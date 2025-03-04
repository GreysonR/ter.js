const vec = require("../geometry/vec.js");
const Node = require("../node/Node.js");
const Common = require("../core/Common.js");
const PolygonRender = require("../render/PolygonRender.js");
const Sprite = require("../render/Sprite.js");
const Spritesheet = require("../render/Spritesheet.js")
const Bezier = require("../geometry/Bezier.js");
const CollisionShape = require("../physics/CollisionShape.js");
const decomp = require("poly-decomp");

/**
 * A rigid body with physics.
 * ## Events
 * | Name | Description | Arguments |
 * | ---- | ----------- | --------- |
 * | bodyEnter | Body starts colliding with another | `(otherBody: RigidBody, collision: Object)` |
 * | bodyInside | Body is currently colliding with another. Triggered every frame after the initial collision. In other words, it won't trigger the same frame as `bodyEnter` but will every subsequent frame the bodies are still colliding | `(otherBody: RigidBody, collision: Object)` |
 * | bodyExit | Triggered the frame bodies stop colliding | `(otherBody: RigidBody, collision: Object)` |
 * | beforeUpdate | Triggered every frame before forces are applied to the body's velocity and then cleared. Best used to apply forces to the body. It's only called when the body is in the world | None |
 * | duringUpdate | Triggered every frame before the body's position is updated using its velocity. Best used to clear forces from the body. It's only called when the body is in the world | None |
 * | add | Triggered before the body is added to the world | None |
 * | delete | Triggered before the body is removed from the world | None |
 * 
 * @extends Node
 */
class RigidBody extends Node {
	static defaultOptions = { // not used, but consistent with other classes for documentation
		mass: 1,
		restitution: 4,
		frictionAir: 0.05,
		frictionAngular: 0.01,
		friction: 0.1,
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
	 * @private
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
			let cp1 = prevCurNormalized.mult(-curRound * 0.5).add(cur);
			let cp2 = curNextNormalized.mult(curRound *  0.5).add(cur);
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
	/**
	 * Indicates type of node. In this case, "RigidBody"
	 * @readonly
	 */
	nodeType = "RigidBody";
	/**
	 * @private
	 */
	vertices = [];

	/**
	 * @type {Number}
	 * @readonly
	 */
	mass = 1;
	/**
	 * Bounciness
	 * @type {Number}
	 */
	restitution = 0.1;
	/**
	 * How much the body is always slowed down
	 * @type {Number}
	 */
	frictionAir = 0.05;
	/**
	 * How much body's rotation is always slowed down
	 * @type {Number}
	 */
	frictionAngular = 0.01;
	/**
	 * @type {Number}
	 */
	friction = 0.1;
	round = 0;
	roundQuality = 20;

	/**
	 * If the body is static (unmoving). Change through `setStatic`
	 * @type {Boolean}
	 * @readonly
	 */
	isStatic = false;
	/**
	 * If the body acts like a sensor, detecting collisions while not hitting anything
	 * @type {Boolean}
	 */
	isSensor = false;
	/**
	 * If the body has any collisions. Change through `setCollisions`
	 * @type {Boolean}
	 * @readonly
	 */
	hasCollisions = true;
	/**
	 * What bodies it can collide with.
	 * The layer is like what collision group the body belongs to and the mask is what layers the body will collide with. 
	 * They are compared using their bits to indicate what layer it is in/collides with. <br>
	 * Another way to visualize it looking at the bits:<br>
	 * 	Layer:&nbsp;&nbsp; 0 1 0 1<br>
	 * 	Mask 1: 0 0 0 1 <-- collides <br>
	 * 	Mask 2: 0 0 1 0 <-- doesn't collide<br>
	 * 	Mask 3: 1 1 1 0 <-- collides<br>
	 * In other words, if `layer & mask != 0` (bitwise and) for *either* of the bodies in the collision, the bodies can collide
	 * @type {Object}
	 * @example
	 * // In every layer, collides with everything (the default)
	 * body.collisionFilter = {
	 * 	layer: 0xFFFFFF,
	 * 	mask:  0xFFFFFF,
	 * }
	 * // In first 2 layers, collides only with 2nd layer
	 * // So it would collide with itself and any body that has a mask in layers 1 or 2
	 * body.collisionFilter = {
	 * 	layer: 0b0011,
	 * 	mask:  0b0010,
	 * }
	 * 
	 */
	collisionFilter = {
		layer: 0xFFFFFF,
		mask:  0xFFFFFF,
	}

	/**
	 * Creates a new RigidBody
	 * @param {Game} Game - Game object the body should be simulated in; If you're creating a RigidBody from a game object, like `game.Bodies.Rectangle(...)`, then you **must omit** this parameter.
	 * @param {Array} vertices - Array of `vec` representing the body's vertices
	 * @param {vec} position - Position of the body
	 * @param {Object} options - RigidBody options
	 * @example
	 * // Includes all RigidBody options
	 * new RigidBody(game, [new vec(0, 0), new vec(10, 0), new vec(10, 10), new vec(0, 10)], new vec(0, 0), {
	 * 	mass: 1,
	 * 	restitution: 0.1,
	 * 
	 * 	frictionAir: 0.05,
	 * 	frictionAngular: 0.01,
	 * 	friction: 0.1,
	 * 
	 * 	round: 0,
	 * 	roundQuality: 20,
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
	constructor(Game, vertices, position, options = {}) {
		super();
		position = new vec(position);
		let { Engine } = Game;
		if (!this.Game) this.Game = Game;
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

		// Set mass
		this._inverseMass = 1 / this.mass;

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
	 * Adds the body to its world
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
	 * Removes the body from its world
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
	 * @param {Object} options - [Polygon Render](./PolygonRender.html) options
	 * @param {PIXI.Container} [container=this.Game.Render.app.stage] - Container polygon render is added to. Defaults to the main render container of the game the body is in.
	 * @return {RigidBody} `this`
	 * @example
	 * body.addPolygonRender({
	 * 	layer: 0, // Render layer, higher means it is rendered "closer" to the camera and above other objects, like CSS z-index
	 * 	visible: true,
	 * 	alpha: 1, // Opacity, between 0-1
	 * 	
	 * 	// All colors can be a hex code, rgb, rgba, or "transparent"
	 * 	background: "#ffffff80", // fill color
	 * 
	 * 	border: "#ff0000", // border color
	 * 	borderWidth: 3, // How thick border is, set to 0 to disable border
	 * 	lineCap: "butt", // How border should end. Doesn't do anything for closed bodies
	 * 	lineJoin: "miter", // How border's corners should look. Same options as ctx.lineJoin property
	 * 	
	 * 	round: 0, // How rounded the polygon should look. Only works for Rectangles
	 * });
	 */
	
	addPolygonRender(options, container = this.Game.Render.app.stage) {
		let render = new PolygonRender({
			container: container,
			position: new vec(this.position),
			vertices: this.vertices,
			angle: this.angle,
			
			...options
		});
		if (this.isAdded()) render.add();
		this.addChild(render);
		this.polygonRender = render;
		
		return this;
	}

	/**
	 * Adds a sprite to body
	 * @param {Object} options - [Sprite](./Sprite.html) options
	 * @param {PIXI.Container} [container=this.Game.Render.app.stage] - Container sprite is added to. Defaults to the main render container of the game the body is in.
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
	 * 	width:  undefined, // number, defaults to fit body if a Rectangle or Circle, or width of image if not
	 * 	height: undefined, // number, defaults to fit body if a Rectangle or Circle, or height of image if not
	 * });
	 */
	addSprite(options, container = this.Game.Render.app.stage) {
		let render = new Sprite({
			container: container,
			position: new vec(this.position),
			angle: this.angle,
			
			...options
		});
		if (this.isAdded()) render.add();
		this.addChild(render);
		this.sprite = render;
		
		return this;
	}
	/**
	 * Adds a new Spritesheet to body
	 * @param {PIXI.Container} container - Container the Spritesheet is added to
	 * @param {Object} options - [Spritesheet](./Spritesheet.html) options
	 * @return {RigidBody} `this`
	 */
	addSpritesheet(container, options) {
		let render = new Spritesheet({
			container: container,
			position: new vec(this.position),
			angle: this.angle,
			
			...options
		});
		this.spritesheet = render;
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
	 * Changes the body's mass to a new value
	 * @param {number} mass
	 */
	setMass(mass) {
		this.mass = mass;
		this._inverseMass = 1 / this.mass;
		this._updateInertia();
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
		if (!position instanceof vec) throw new Error("position must be a vec");
		let delta = position.sub(this.position);
		this.translate(delta);
	}

	/**
	 * Instantly changes the body's velocity to a specific value
	 * @param {vec} velocity - Velocity the body should have
	 */
	setVelocity(velocity) {
		if (!velocity instanceof vec) throw new Error("velocity must be a vec");
		if (velocity.isNaN()) {
			console.error(velocity);
			throw new Error("velocity is NaN");
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
			throw new Error("angular velocity is NaN");
		}
		if (this.isStatic) return;
		this.angularVelocity = velocity;
	}

	/**
	 * Applies a force to the body, ignoring mass. The body's velocity changes by force * delta
	 * @param {vec} force - Amount of force to be applied, in px / sec^2
	 * @param {number} [delta=Engine.delta] - Amount of time that the force is applied, in seconds. Set to 1 if applying instantaneous force
	 */
	applyForce(force, delta = this.Engine.delta) { // set delta to 1 if you want to apply a force for only 1 frame
		if (!force instanceof vec) throw new Error("force must be a vec");
		if (force.isNaN()) return;
		if (this.isStatic) return;
		this.force.add2(force.mult(delta));
	}
	
	/**
	 * Applies a rotational force (torque) to the body, ignoring mass. The body's angular velocity changes by force * delta
	 * @param {number} force - Amount of torque to be applied, in radians / sec^2
	 * @param {number} [delta=Engine.delta] - Amount of time that the force is applied, in seconds. Set to 1 if applying instantaneous force
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
	positionImpulse = new vec(0, 0);
	torque = 0;

	totalContacts = 0;
	
	rotationPoint = new vec(0, 0);

	_inverseMass = 1;
	inertia = 1;
	_inverseInertia = 0.000015;	

	#events = {
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
		else {
			console.warn(event + " is not a valid event");
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
		this.velocity.add2(this.force.mult(this._inverseMass)).add2(this.Engine.World.gravity.mult(delta));
		this.angularVelocity += this.torque * this._inverseInertia;

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
	_update(delta, updateGrid = true) {
		this.trigger("duringUpdate");

		if (this.isStatic) return;

		let { velocity: lastVelocity, angularVelocity: lastAngularVelocity } = this._last;

		let frictionAir = (1 - this.frictionAir) ** delta;
		let frictionAngular = (1 - this.frictionAngular) ** delta;

		if (this.velocity.isNaN() || isNaN(delta + frictionAir + frictionAngular)) {
			return;
		}
		
		this.velocity.mult2(frictionAir);
		if (this.velocity.x !== 0 || this.velocity.y !== 0){
			this.translate(this.velocity.add(lastVelocity).mult(delta / 2)); // trapezoidal rule to take into account acceleration
		}
		this._last.velocity.set(this.velocity);

		this.angularVelocity *= frictionAngular;
		if (this.angularVelocity){
			let angleChange = (this.angularVelocity + lastAngularVelocity) * delta / 2; // trapezoidal rule to take into account acceleration
			let pivot = this.rotationPoint.rotate(this.angle + angleChange).add(this.position);
			this.translateAngle(angleChange, pivot, false);
		}
		this._last.angularVelocity = this.angularVelocity;

		if (updateGrid && this.hasCollisions) {
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
