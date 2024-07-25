"use strict";

const { arrayDelete } = require("../core/Common.js");
const vec = require("./vec.js");

/**
 * A broadphase grid that can handle bodies and points
 */
class Grid {
	static id = 0;
	/**
	 * Grid cells. You can access grid cells with `grid.grid[id]`, with `id` being the grid cell id corresponding to the x/y position of the cell. You can find the grid cell id with `grid.pair(cellPosition)` 
	 * @type {Object}
	 */
	grid = {};
	/**
	 * Set of all created grid ids
	 * @type {Set}
	 */
	gridIds = new Set();
	
	/**
	 * The grid size
	 * @type {number}
	 * @instance
	 */
	gridSize = 2000;

	/**
	 * Creates an empty grid
	 * @param {number} size - Size of each grid cell
	 */
	constructor(size = 2000) {
		this.gridSize = size;
		this.id = Grid.id++;
	}
	/**
	 * Takes a cell position and returns the corresponding grid cell id
	 * @param {vec} pos
	 * @returns {Number} grid cell id
	 */
	pair(pos) {
		let x = pos.x >= 0 ? pos.x * 2 : pos.x * -2 - 1;
		let y = pos.y >= 0 ? pos.y * 2 : pos.y * -2 - 1;
		return (x >= y) ? (x * x + x + y) : (y * y + x);
	}
	/**
	 * Takes a grid cell id and returns the corresponding cell position
	 * @param {Number} n - Grid cell id
	 * @returns {vec} Cell position
	 */
	unpair(n) {
		let sqrtz = Math.floor(Math.sqrt(n));
		let sqz = sqrtz * sqrtz;
		let result1 = ((n - sqz) >= sqrtz) ? new vec(sqrtz, n - sqz - sqrtz) : new vec(n - sqz, sqrtz);
		let x = result1.x % 2 === 0 ? result1.x / 2 : (result1.x + 1) / -2;
		let y = result1.y % 2 === 0 ? result1.y / 2 : (result1.y + 1) / -2;
		return new vec(x, y);
	}
	/**
	 * Takes a body with a bounding box and returns the range of grid cells that the body is in
	 * @param {RigidBody|Bounds|vec} body - the RigidBody, global space vec, or global space bounds to convert to grid space Bounds 
	 * @returns {Bounds} Grid space bounds
	 */
	getBounds(body) {
		let size = this.gridSize;
		if (typeof body.bounds === "object") {
			return this.getBounds(body.bounds);
		}
		else if (typeof body.max === "object" && typeof body.min === "object") {
			return {
				min: body.min.div(size).floor2(),
				max: body.max.div(size).floor2(),
			};
		}
		else if (body.x !== undefined && body.y !== undefined) {
			let x = Math.floor(body.x / size);
			let y = Math.floor(body.y / size);
			return {
				min: new vec(x, y),
				max: new vec(x, y),
			};
		}
	}

	/**
	 * Takes grid-space bounds and returns an array of all bucket ids within those bounds
	 * @param {Bounds} bounds - Bounding box in form of `{ min: vec, max: vec }` to get IDs of grid cells within
	 * @returns {Array<Number>} Array of grid cell ids
	 */
	getBucketIds(bounds) {
		let ids = [];
		for (let x = bounds.min.x; x <= bounds.max.x; x++) {
			for (let y = bounds.min.y; y <= bounds.max.y; y++) {
				let n = this.pair(new vec(x, y));

				if (this.grid[n]) {
					ids.push(n);
				}
			}
		}

		return ids;
	}

	/**
	 * Takes global-space bounds and returns an array of all buckets in those bounds
	 * @param {*} bounds 
	 */
	getBuckets(bounds) {
		let ids = this.getBucketIds(this.getBounds(bounds));
		return ids.map(id => this.grid[id]);
	}

	/**
	 * Adds the body to the grid
	 * @param {RigidBody} body - Body added to the grid
	 */
	addBody(body) {
		let bounds = this.getBounds(body);

		if (!bounds) {
			console.error(body);
			throw new Error("Could not find bounds of body");
		}

		if (!body._Grids) body._Grids = {};
		if (!body._Grids[this.id]) body._Grids[this.id] = [];

		for (let x = bounds.min.x; x <= bounds.max.x; x++) {
			for (let y = bounds.min.y; y <= bounds.max.y; y++) {
				let n = this.pair(new vec(x, y));

				body._Grids[this.id].push(n);
				if (!this.grid[n]) {
					this.grid[n] = [];
					this.gridIds.add(n);
				}
				this.grid[n].push(body);
			}
		}
	}
	/**
	 * Removes the body from the grid
	 * @param {RigidBody} body - Body removed from the grid
	 */
	removeBody(body) {
		for (let n of body._Grids[this.id]) {
			let node = this.grid[n];
			if (node) {
				arrayDelete(node, body);
				if (node.length === 0) {
					delete this.grid[n];
					this.gridIds.delete(n);
				}
			}
		}
		delete body._Grids[this.id];
	}
	/**
	 * Adds a vector point to the grid
	 * @param {vec} point - Point added
	 */
	addPoint(point) {
		if (!point._Grids) point._Grids = {};
		if (!point._Grids[this.id]) point._Grids[this.id] = [];

		let position = point.x !== undefined ? point : point.position;
		let bucketPos = position.div(this.gridSize).floor2();
		let n = this.pair(bucketPos);
		point._Grids[this.id].push(n);
		if (!this.grid[n]) {
			this.grid[n] = [];
			this.gridIds.add(n);
		}
		this.grid[n].push(point);
	}
	/**
	 * Remove a vector point from the grid
	 * @param {vec} point - Point removed
	 */
	removePoint(point) {
		if (!point._Grids) {
			console.error(point);
			throw new Error("Can't remove point that isn't in grid");
		}
		for (let n of point._Grids[this.id]) {
			let node = this.grid[n];
			if (node) {
				arrayDelete(node, point);
				if (node.length === 0) {
					delete this.grid[n];
					this.gridIds.delete(n);
				}
			}
		}
		delete point._Grids[this.id];
	}
	/**
	 * Updates the body's position in the grid
	 * @param {RigidBody|vec} body - Body in the grid
	 */
	updateBody(body) {
		let curNodes = body._Grids[this.id];
		let oldNodes = new Set(curNodes);
		let bounds = this.getBounds(body);
		
		if (!bounds) {
			console.error(body);
			throw new Error("Could not find bounds of body");
		}

		for (let x = bounds.min.x; x <= bounds.max.x; x++) {
			for (let y = bounds.min.y; y <= bounds.max.y; y++) {
				let n = this.pair(new vec(x, y));

				if (!oldNodes.has(n)) {
					curNodes.push(n);
					if (!this.grid[n]) {
						this.grid[n] = [];
						this.gridIds.add(n);
					}
					this.grid[n].push(body);
				}
				else {
					oldNodes.delete(n);
				}
			}
		}

		for (let n of oldNodes) {
			let node = this.grid[n];
			arrayDelete(curNodes, n);
			if (!node) continue;
			arrayDelete(node, body);
			if (node.length === 0) {
				delete this.grid[n];
				this.gridIds.delete(n);
			}
		}
	}
}
module.exports = Grid;
