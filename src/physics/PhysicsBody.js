const vec = require("./vec.js");

module.exports = class PhysicsBody {
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
	constructor(type, options, vertices, position) {
		this.type = type;
		this.id = ter.Bodies.uniqueId;
		
		if (!options.render) options.render = {}; // Makes it easier to check if an option exists in options.render

		// Set random background color if none specified
		if (!options.render.background) {
			let colors = [ "#1AD465", "#FEC64F", "#4FB8FE", "#FF4F4F", "#AD59FF" ];
			options.render.background = colors[Math.floor(Math.random() * colors.length)];
		}
		
		// Shallow copy the world
		this.world = options.world || ter.World;
		delete options.world;

		// Shallow copy render container
		if (options.render?.container) {
			this.render.container = options.render.container;
			delete options.render.container;
		}

		// Merge options with body
		ter.Common.merge(this, options);
		
		// Parse collision filter properties
		for (let filterType in ["mask", "category"]) {
			if (typeof this.collisionFilter[filterType] === "string") {
				this.collisionFilter[filterType] = parseInt(this.collisionFilter[filterType], 2);
			}
		}

		// Convert vertices to ter.vec
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
			decomp.#makeCCW(decompVerts);
			let concaveVertices = decomp.quickDecomp(decompVerts);
			let parentCenter = this.#getCenterOfMass();
			for (let i = 0; i < concaveVertices.length; i++) {
				let vertices = concaveVertices[i].map(v => new vec(v[0], v[1]));
				let center = this.#getCenterOfMass(vertices);
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
		this.#updateBounds();
		this.#updateAxes();
		this._updateInertia();

		// Set angle from options
		if (options.angle) {
			this.angle = 0;
			this.setAngle(-options.angle);
		}
	}
	/**
	 * Removes overlapping vertices
	 * 
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
	 * 
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
	 * 
	 * @returns {void}
	 */
	#makeConvex() {
		if (!this.#isConvex()) {
			let removed = this.removed;
			this.delete();
			
			let { vertices, position } = this;
			this.children = [];
			let verts = vertices.map(v => [v.x, v.y]);
			decomp.removeCollinearPoints(verts, 0.4);
			let concaveVertices = decomp.quickDecomp(verts);
			let parentCenter = this.#getCenterOfMass();

			for (let i = 0; i < concaveVertices.length; i++) {
				let vertices = concaveVertices[i].map(v => new vec(v[0], v[1]));
				let center = this.#getCenterOfMass(vertices);
				let body = new FromVertices(vertices, position.add(center).sub(parentCenter));
				body.delete();
				body.parent = this;
				this.children.push(body);
			}

			if (!removed) {
				this.add();
			}
		}
	}

	/**
	 * Sets the inertia of the body to what's calculated in `#getInertia()` if the body is not static
	 * 
	 * @returns {void}
	 */
	_updateInertia() {
		if (this.isStatic) {
			this.mass = Infinity;
			this.inverseMass = 0;
		}
		else {
			this.inertia = this.#getInertia();
			this.inverseInertia = 1 / this.inertia;
		}
	}
	/**
	 * Calculates inertia from the body's vertices
	 * 
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
	 * Calculates the area of the body if it is convex
	 * 
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
	 * Changes if the body is static
	 * 
	 * @param {Boolean} isStatic - If the body should be static
	 * @returns {void}
	 */
	setStatic(isStatic) {
		let { dynamicGrid, staticGrid } = this.world;
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
		let { dynamicGrid, staticGrid } = this.world;
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
	 * Changes what the render's container is
	 * 
	 * @param {PIXI.Container} container - The PIXI container the body should be rendered in
	 * @returns {void}
	 */
	setRenderContainer(container) {
		let render = this.render;
		let graphic = render.graphic;
		render.container = container;
		if (!this.removed) {
			graphic.delete();
			graphic.container = container;
			graphic.add();
		}
		else {
			graphic.container = container;
		}
	}

	id = 0;
	world = ter.World;

	velocity = new vec(0, 0);
	position = new vec(0, 0);
	center = new vec(0, 0);
	force = new vec(0, 0);
	impulse = new vec(0, 0);
	angle = 0;
	rotationPoint = new vec(0, 0);
	angularVelocity = 0;
	torque = 0;

	last = {
		velocity: new vec(0, 0),
		angularVelocity: 0,
	};

	vertices = [];
	children = [];
	parent = null;
	axes = [];
	buckets = [];

	restitution = 0.5;
	frictionAir = 0.05;
	frictionAngular = 0.01;
	friction = 0.01;
	round = 0;

	mass = 1;
	inverseMass = 1;
	inertia = 1;
	inverseInertia = 0.000015;
	
	isStatic = false;
	isSensor = false;
	hasCollisions = true;


	pairs = [];
	lastSeparations = {};
	numContacts = 0;
	slop = 0.001;

	bounds = {
		min: new vec({ x: 0, y: 0 }),
		max: new vec({ x: 1, y: 1 })
	}
	render = {
		background: "#1AD465",
		alpha: 1,
		border: "transparent",
		borderWidth: 3,
		borderOffset: 0.5,
		lineJoin: "miter",
		lineDash: false,
		lineCap: "butt",
		visible: true,
		sprite: false,
		layer: 0,
	}
	collisionFilter = {
		category: 0,
		mask: 0,
	}

	/**
	 * Removes the body from its world
	 * 
	 * @returns {void}
	 */
	delete() {
		let { world:World } = this;
		if (World.bodies.includes(this)) {
			this.trigger("delete");
			this.removed = true;
			ter.Render.bodies.delete(this);

			if (this.render.graphic) {
				this.render.graphic.delete();
			}

			World.bodies.delete(this);
			if (this.children.length === 0 && this._Grids) {
				if (this.isStatic && this._Grids[World.staticGrid.id]) {
					World.staticGrid.removeBody(this);
				}
				else if (this._Grids[World.dynamicGrid.id]) {
					World.dynamicGrid.removeBody(this);
				}
			}

			for (let i = 0; i < this.pairs.length; i++) {
				ter.Bodies._cleansePair(this.pairs[i]);
			}
		}

		for (let i = 0; i < this.children.length; i++) {
			this.children[i].delete();
		}
	}

	/**
	 * Adds the body to its world
	 * 
	 * @returns {void}
	 */
	add() {
		let { world:World } = this;
		if (!World.bodies.includes(this)) {
			this.trigger("add");
			this.removed = false;

			ter.Render.bodies.add(this);

			if (this.render.graphic) {
				this.render.graphic.add();
			}
			
			World.bodies.push(this);

			if (this.children.length === 0 && this.hasCollisions) {
				if (this.isStatic) {
					World.staticGrid.addBody(this);
				}
				else {
					World.dynamicGrid.addBody(this);
				}
			}

			for (let i = 0; i < this.children.length; i++) {
				this.children[i].add();
			}
		}
	}

	/**
	 * 
	 * @param {ter.vec} position - The position the body should be
	 * @param {Boolean} _ignoreChildren - If the body's children should be affected
	 * @example
	 * body.setPosition(new ter.vec(100, 100)); // Sets the body's position to (100, 100) 
	 * @returns {void}
	 */
	setPosition(position, _ignoreChildren = false) {
		if (position.isNaN()) return;
		let last = this.position;
		let delta = position.sub(last);

		this.translate(delta, true, _ignoreChildren);

		this.position.x = position.x;
		this.position.y = position.y;

		this.#updateBounds();
	}

	/**
	 * 
	 * @param {Number} angle - Angle body should be in radians
	 * @example
	 * body.setAngle(Math.PI); // Sets the body's angle to Pi radians, or 180 degrees 
	 * @returns {void}
	 */
	setAngle(angle) {
		if (isNaN(angle)) return;
		if (angle !== this.angle) {
			let delta = ter.Common.angleDiff(angle, this.angle);
			
			this.translateAngle(delta);
		}
	}

	/**
	 * Instantly changes the body's velocity to a specific value
	 * 
	 * @param {ter.vec} velocity - The velocity the body should go
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
	 * Applies a force to the body, ignoring mass. The body's velocity changes by force * delta
	 * 
	 * @param {ter.vec} force - The amount of force to be applied, in px / sec^2
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
	 * 
	 * @param {Number} force - The amount of torque to be applied, in radians / sec^2
	 * @param {Number} delta - The amount of time the force should be applied in seconds, set to 1 if only applying instantaneous force
	 * @returns 
	 */
	applyTorque(force, delta = Engine.delta) { // set delta to 1 if you want to apply a force for only 1 frame
		if (isNaN(force)) return;
		this.torque += force * delta;
	}

	/**
	 * Sets the render layer (z index), changing the order the body is rendered
	 * @param {Number} layer - The render layer it should be on 
	 */
	setLayer(layer) {
		this.render.graphic.setLayer(layer);
	}
	
	/**
	 * Ensures vertices are counterclockwise winding and centered, and updates the area, bounding box, and the axes
	 * 
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
	 * 
	 * @param {Boolean} force - If all vertices should be completely reordered using their angle from the center 
	 */
	#makeCCW(force = false) { // makes vertices go counterclockwise if they're clockwise
		if (force) { // reorders vertices by angle from center - can change order of vertices
			let vertices = this.vertices;
			let center = this.position;
			let mapped = vertices.map(v => [v, v.sub(center).angle]);
			mapped.sort((a, b) => ter.Common.angleDiff(a[1], b[1]));
			this.vertices = mapped.map(v => v[0]);
		}
		else { // reverses vertices if the 1st and 2nd are going wrong direction - never changes order of vertices
			let vertices = this.vertices;
			let center = this.position;
	
			let mapped = vertices.map(v => v.sub(center).angle);
			if (ter.Common.angleDiff(mapped[0], mapped[1]) > 0) {
				this.vertices.reverse();
			}
		}
	}
	/**
	 * Calculates the center of mass of a convex body. Uses algorithm from https://bell0bytes.eu/centroid-convex/
	 * @param {Array} vertices - Array of vertices (`ter.vec`s) to find the center of 
	 * @returns 
	 */
	#getCenterOfMass(vertices = this.vertices) {
		let centroid = new vec(0, 0);
		let children = this.children;

		if (children.length > 0) {
			let totalArea = 0;
			for (let i = 0; i < children.length; i++) {
				let child = children[i];
				totalArea += child.area;
				centroid.add2(child.position.sub(this.position).mult2(child.area).add2(this.position));
			}
			centroid.div2(totalArea);
		}
		else {
			let det = 0;
			let tempDet = 0;
			let numVertices = vertices.length;
	
			for (let i = 0; i < vertices.length; i++) {
				let curVert = vertices[i];
				let nextVert = vertices[(i + 1) % numVertices];
	
				tempDet = curVert.x * nextVert.y - nextVert.x * curVert.y;
				det += tempDet;
	
				centroid.add2({ x: (curVert.x + nextVert.x) * tempDet, y: (curVert.y + nextVert.y) * tempDet });
			}
	
			centroid.div2(3 * det);
		}

		return centroid;
	}
	/**
	 * Shifts vertices so their center is at the body's position 
	 */
	#recenterVertices() {
		let center = this.#getCenterOfMass();
		let position = this.position;
		this.center = center;
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

		this.axes = axes;
	}
	/**
	 * Creates a renderer for the body
	 */
	_createRenderShape() {
		if (typeof this.render.sprite === "string") { // assume it's the sprite src
			this.render.sprite = {
				src: this.render.sprite,
			}
		}

		if (typeof this.render.sprite === "object") { // assume sprite is an options object
			this.render.graphic = new Sprite(this);
		}
		else { // not a sprite, use vertices
			this.render.graphic = new RenderGeometry(this);
		}
	}

	/**
	 * Shifts the body over by the delta
	 * 
	 * @param {ter.vec} delta - Distance the body should be shifted
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
	 * Rotates the body by `angle`
	 * 
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
	 * Finds the point farthest in a direction
	 * 
	 * @param {ter.vec} vector - The normalized direction to find the support point
	 * @returns {Array} 
	 */
	getSupport(vector) {
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

	/**
	 * Finds if a point is inside the body
	 * 
	 * @param {ter.vec} point The point to query
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


	#events = {
		collisionStart: [],
		collisionActive: [],
		collisionEnd: [],
		beforeUpdate: [], // use to apply forces to current body
		duringUpdate: [], // use to clear forces from current body
		render: [],
		delete: [],
		add: [],
	}
	/**
	 * Binds an event to the body
	 * 
	 * @param {('collisionStart'|'collisionActive'|'collisionEnd'|'beforeUpdate'|'duringUpdate'|'render'|'delete'|'add')} event - Name of event
	 * @param {Function} callback - Function triggered when event is fired
	 */
	on(event, callback) {
		if (!this.#events[event]) {
			this.#events[event] = [];
		}
		this.#events[event].push(callback);
	}
	/**
	 * Unbinds an event from the body. `callback` must be the same function passed to `body.on`
	 * 
	 * @param {('collisionStart'|'collisionActive'|'collisionEnd'|'beforeUpdate'|'duringUpdate'|'render'|'delete'|'add')} event - Name of event
	 * @param {Function} callback - Function to be unbound
	 */
	off(event, callback) {
		event = this.#events[event];
		if (event.includes(callback)) {
			event.splice(event.indexOf(callback), 1);
		}
	}
	/**
	 * 
	 * @param {String} event - Name of event to be triggered
	 * @param  {...any} args - Arguments to be passed to callbacks
	 */
	trigger(event, ...args) {
		let events = this.#events[event];
		for (let i = 0; i < events.length; i++) {
			events[i](...args);
		}

		if (this.parent) {
			this.parent.trigger(event, ...args);
		}
	}
}
