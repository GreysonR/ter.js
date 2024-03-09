const vec = require("../geometry/vec");
const Node = require("../node/Node");
const Common = require("../core/Common");
const Bounds = require("../geometry/Bounds");

/**
 * A node that detects collisions.
 * It's a child of a RigidBody and collisions detected by the CollisionShape are triggered and solved on the RigidBody
 * @extends Node
 */
class CollisionShape extends Node {
	nodeType = "CollisionShape";
	Engine;
	parent;

	position = new vec(0, 0);
	angle = 0;
	
	_axes = [];
	pairs = [];
	_lastSeparations = {};

	bounds;

	constructor(RigidBody, vertices, Engine) {
		super();
		this.vertices = vertices.map(v => new vec(v));
		this.Engine = Engine;
		this.parentNode = RigidBody;

		// Create bounds
		this.bounds = new Bounds(this.vertices);

		// Reset vertices so convex check works properly
		this.#removeDuplicateVertices();
		this._resetVertices();

		// Fully reset vertices
		this._resetVertices();
	}
	//
	// Public user methods
	//
	/**
	 * Adds the collision shape
	 * @return {CollisionShape} `this`
	 */
	add() {
		super.add();
		return this;
	}

	/**
	 * Removes the collision shape
	 * @return {CollisionShape} `this`
	 */
	delete() {
		if (this.isAdded()) {
			super.delete();

			for (let i = 0; i < this.pairs.length; i++) {
				this.Engine.cleansePair(this.pairs[i]);
			}
		}
		return this;
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
	 * Shifts body's position by delta
	 * @param {vec} delta - Distance the body should be shifted
	 */
	translate(delta) {
		if (delta.isNaN() || delta.x === 0 && delta.y === 0) return;
		let vertices = this.vertices;
		for (let i = 0; i < vertices.length; i++) {
			vertices[i].add2(delta);
		}

		this.position.add2(delta);
		this.bounds.update(this.vertices);

		let tree = this.Engine.World.dynamicGrid;
		if (this._Grids && this._Grids[tree.id]) {
			tree.updateBody(this);
		}

		let children = this.children;
		for (let child of children) {
			child.translate(delta);
		}
	}
	/**
	 * Rotates the body to `angle` - Absolute
	 * @param {number} angle - Angle body should be in radians
	 * @example
	 * body.setAngle(Math.PI); // Sets body's angle to Pi radians, or 180 degrees 
	 */
	setAngle(angle, pivot) {
		if (isNaN(angle)) return;
		if (angle !== this.angle) {
			let delta = Common.angleDiff(angle, this.angle);
			this.translateAngle(delta, pivot);
		}
	}

	/**
	 * Rotates the body by `angle`- Relative
	 * @param {number} angle - Amount the body should be rotated, in radians
	 */
	translateAngle(angle, pivot = this.parentNode.rotationPoint.rotate(this.angle + angle).add(this.parentNode.position)) {
		if (isNaN(angle)) return;
		let vertices = this.vertices;

		let sin = Math.sin(angle);
		let cos = Math.cos(angle);

		for (let i = vertices.length; i-- > 0;) {
			let vert = vertices[i];
			let dist = vert.sub(pivot);
			vert.x = this.parentNode.position.x + (dist.x * cos - dist.y * sin);
			vert.y = this.parentNode.position.y + (dist.x * sin + dist.y * cos);
		}

		// let posOffset = rotationPoint.sub(rotationPoint.rotate(angle));
		// this.translate(posOffset);

		this.bounds.update(this.vertices);
		this.#updateAxes();

		super.translateAngle(angle, pivot, false);
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
	 * Ensures vertices are counterclockwise winding and centered, and updates the area, bounding box, and the axes
	 * @private
	 */
	_resetVertices() {
		this.#makeCCW(true);
		this.area = this.#getArea();
		this.#recenterVertices();
		this.bounds.update(this.vertices);
		this.#updateAxes();
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
	 * Shifts position to be at center of mass of vertices
	 */
	#recenterVertices() {
		let center = this.#getCenterOfMass();
		this.position.set(center);
	}
	/**
	 * Finds the center of mass of the shape, assuming the weight distribution is uniform
	 * @returns {vec} The center of mass
	 */
	#getCenterOfMass() {
		let center = Common.getCenterOfMass(this.vertices);
		return center;
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
	 * Finds the vertice farthest in a direction
	 * @param {vec} vector - Normalized direction to find the support point
	 * @param {vec} position - Position to base support on
	 * @return {Array} 
	 * @private
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
	/**
	 * Finds if a point is inside the body
	 * @param {vec} point - Point to query
	 * @return {boolean} If the point is inside the body's vertices
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
}
module.exports = CollisionShape;
