const vec = require("../geometry/vec");

/**
 * @class Bounds
 * AABB bounds
 */
module.exports = class Bounds {
	min = new vec(0, 0);
	max = new vec(0, 0);
	constructor(min, max) {
		if (Array.isArray(min)) { // min is an array of vecs
			this.update(min);
		}
		else if (min.min && min.max) { // min is a bounds object
			this.min.set(min.min);
			this.max.set(min.max);
		}
		else { // min and max are vectors
			this.min.set(min);
			this.max.set(max);
		}
	}

	/**
	 * Updates the bounds based on an array vertices
	 * @param {Array} - Array of vertices 
	 */
	update(vertices) {
		let minX = Infinity, minY = Infinity;
		let maxX = -Infinity, maxY = -Infinity;
	
		for (let i = 0; i < vertices.length; i++) {
			let v = vertices[i];
	
			if (v.x < minX) minX = v.x;
			if (v.x > maxX) maxX = v.x;
			if (v.y < minY) minY = v.y;
			if (v.y > maxY) maxY = v.y;
		}
	
		this.min.x = minX;
		this.min.y = minY;
		this.max.x = maxX;
		this.max.y = maxY;
	}

	/**
	 * Creates a random point within the bounds
	 * @returns {vec} Random point within bounds
	 */
	randomPoint() {

	}
}
