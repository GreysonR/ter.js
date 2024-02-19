const vec = require("../geometry/vec.js");

/**
 * @namespace Common
 */
let Common = module.exports = {
	clamp: function(x, min, max) { // clamps x so that min <= x <= max
		return Math.max(min, Math.min(x, max));
	},
	angleDiff: function(angle1, angle2) { // returns the signed difference between 2 angles
		function mod(a, b) {
			return a - Math.floor(a / b) * b;
		}
		return mod(angle1 - angle2 + Math.PI, Math.PI * 2) - Math.PI;
	},
	modDiff: function(x, y, m = 1) { // returns the signed difference between 2 values with any modulo, ie 11 oclock is 2 hours from 1 oclock with m = 12
		function mod(a, b) {
			return a - Math.floor(a / b) * b;
		}
		return mod(x - y + m/2, m) - m/2;
	},

	/**
	 * @description Pairs 2 positive integers, returning a unique number for each possible pairing using elegant pairing - http://szudzik.com/ElegantPairing.pdf
	 * @param number x - 1st number, must be positive integer
	 * @param number y - 2nd number, must be positive integer
	 * @returns number Unique number from those 
	 */
	pair: function(x, y) {
		if (x > y)
			return x*x + x + y;
		return y*y + x;
	},
	/**
	 * Takes a paired number and returns the x/y values that created that number
	 * @param number n Paired number
	 * @returns {vec} Pair of x/y that created that pair
	 */
	unpair: function(n) {
		let z = Math.floor(Math.sqrt(n));
		let l = n - z * z;
		return l < z ? new vec(l, z) : new vec(z, l - z);
	},

	/**
	 * Pairs 2 positive integers, returning a unique number for each possible pairing using elegant pairing - http://szudzik.com/ElegantPairing.pdf
	 * Returns the same value if x/y are switched
	 * @param number x - 1st number, must be positive integer
	 * @param number y - 2nd number, must be positive integer
	 * @returns number Unique number from those 
	 */
	pairCommon: function(x, y) { // Elegant pairing function, but gives the same result if x/y are switched
		if (x > y)
			return x*x + x + y;
		return y*y + y + x;
	},

	/**
	 * Calculates the center of mass of a convex body. Uses algorithm from https://bell0bytes.eu/centroid-convex/
	 * @param {Array} vertices - Array of `vec`s to find the center of 
	 * @returns {void}
	 */
	getCenterOfMass(vertices) {
		let centroid = new vec(0, 0);
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

		return centroid;
	},

	/**
	 * Parses a color into its base hex code and alpha. Supports hex, hex with alpha, rgb, and rgba
	 * @param string originalColor - Color to be parsed
	 * @returns {Array} Array of [hex code, alpha] of parsed color
	 */
	parseColor: function(originalColor) {
		if (originalColor === "transparent") {
			return ["#000000", 0];
		}
		let color;
		let alpha = 1;

		if (originalColor[0] === "#" && originalColor.length === 9) { // is a hex code with alpha
			color = originalColor.slice(0, 7);
			alpha = parseInt(originalColor.slice(7), 16) / 256; // convert to decimel
		}
		else if (originalColor[0] === "#" && originalColor.length === 7) { // is a hex code w/0 alpha
			color = originalColor;
			alpha = 1;
		}
		else if (originalColor.slice(0, 4) === "rgb(") { // rgb
			color = originalColor.slice(originalColor.indexOf("(") + 1, originalColor.indexOf(")")).split(",");
			color = "#" + color.map(value => parseInt(value).toString(16).padStart(2, "0")).join("");
			alpha = 1;
		}
		else if (originalColor.slice(0, 5) === "rgba(") { // rgba
			color = originalColor.slice(originalColor.indexOf("(") + 1, originalColor.indexOf(")")).split(",");
			alpha = parseInt(color.pop()) / 255;
			color = "#" + color.map(value => parseInt(value).toString(16).padStart(2, "0")).join("");
		}
		return [color, alpha];
	},

	/**
	 * Deep copies `objB` onto `objA` in place.
	 * @param {Object} objA - First object
	 * @param {Object} objB - 2nd object, copied onto `objA`
	 * @param number maxDepth - The maximum depth it can copy
	 * @returns {void}
	 */
	merge: function(objA, objB, maxDepth = Infinity, hash = new WeakSet()) {
		hash.add(objB);

		Object.keys(objB).forEach(option => {
			let value = objB[option];
			
			if (Array.isArray(value)) {
				objA[option] = [ ...value ];
			}
			else if (typeof value === "object" && value !== null) {
				if (maxDepth > 1) {
					if (hash.has(value)) { // Cyclic reference
						objA[option] = value;
						return;
					}
					if (typeof objA[option] !== "object") {
						objA[option] = {};
					}
					Common.merge(objA[option], value, maxDepth - 1, hash);
				}
				else {
					objA[option] = value;
				}
			}
			else {
				objA[option] = value;
			}
		});
	},
	
	/**
	 * Finds if a variable is a class in disguise
	 * @param {*} obj - Variable to check
	 * @returns {boolean} If the variable is a class
	 */
	isClass: function(obj) {
		const isCtorClass = obj.constructor
			&& obj.constructor.toString().substring(0, 5) === 'class'
		if(obj.prototype === undefined) {
			return isCtorClass;
		}
		const isPrototypeCtorClass = obj.prototype.constructor 
			&& obj.prototype.constructor.toString
			&& obj.prototype.constructor.toString().substring(0, 5) === 'class'
		return isCtorClass || isPrototypeCtorClass;
	},

	/**
	 * Checks if line `a1`->`a2` is intersecting line `b1`->`b2`, and at what point
	 * @param {vec} a1 - Start of line 1
	 * @param {vec} a2 - End of line 1
	 * @param {vec} b1 - Start of line 2
	 * @param {vec} b2 - End of line 2
	 * @returns {vec} Point of intersection, or null if they don't intersect
	 */
	lineIntersects: function(a1, a2, b1, b2) { // tells you if lines a1->a2 and b1->b2 are intersecting, and at what point
		if (a1.x === a2.x || a1.y === a2.y) {
			a1 = new vec(a1);
		}
		if (b1.x === b2.x || b1.y === b2.y) {
			b1 = new vec(b1);
		}
		if (a1.x === a2.x)
			a1.x += 0.00001;
		if (b1.x === b2.x)
			b1.x += 0.00001;
		if (a1.y === a2.y)
			a1.y += 0.00001;
		if (b1.y === b2.y)
			b1.y += 0.00001;

		let d = (a1.x - a2.x) * (b1.y - b2.y) - (a1.y - a2.y) * (b1.x - b2.x);
		if (d === 0) return false;

		let nx = (a1.x * a2.y - a1.y * a2.x) * (b1.x - b2.x) - (a1.x - a2.x) * (b1.x * b2.y - b1.y * b2.x);
		let ny = (a1.x * a2.y - a1.y * a2.x) * (b1.y - b2.y) - (a1.y - a2.y) * (b1.x * b2.y - b1.y * b2.x);

		let pt = new vec(nx / d, ny / d);

		let withinX = pt.x > Math.min(a1.x, a2.x) && pt.x < Math.max(a1.x, a2.x) && pt.x > Math.min(b1.x, b2.x) && pt.x < Math.max(b1.x, b2.x);
		let withinY = pt.y > Math.min(a1.y, a2.y) && pt.y < Math.max(a1.y, a2.y) && pt.y > Math.min(b1.y, b2.y) && pt.y < Math.max(b1.y, b2.y);
		if (withinX && withinY) {
			return pt;
		}
		else {
			return null;
		}
	},

	/**
	 * Tests if line `a1`->`a2` is intersecting `body`
	 * @param {vec} a1 - Start of line
	 * @param {vec} a2 - End of line
	 * @param {RigidBody} body - Body to test
	 * @returns {boolean} If the line is intersecting the body
	 */
	lineIntersectsBody: function(a1, a2, body) { // tells you if line a1->a2 is intersecting with body, returns true/false
		if (body.children.length > 0) {
			for (let child of body.children) {
				if (Common.lineIntersectsBody(a1, a2, child)) {
					return true;
				}
			}
			return false;
		}
		let ray = a2.sub(a1);
		let rayNormalized = ray.normalize();
		let rayAxes = [ rayNormalized, rayNormalized.normal() ];
		let rayVertices = [ a1, a2 ]; 

		function SAT(verticesA, verticesB, axes) {
			for (let axis of axes) {
				let boundsA = { min: Infinity, max: -Infinity };
				let boundsB = { min: Infinity, max: -Infinity };
				for (let vertice of verticesA) {
					let projected = vertice.dot(axis);
					if (projected < boundsA.min) {
						boundsA.minVertice
					}
					boundsA.min = Math.min(boundsA.min, projected);
					boundsA.max = Math.max(boundsA.max, projected);
				}
				for (let vertice of verticesB) {
					let projected = vertice.dot(axis);
					boundsB.min = Math.min(boundsB.min, projected);
					boundsB.max = Math.max(boundsB.max, projected);
				}

				if (boundsA.min > boundsB.max || boundsA.max < boundsB.min) { // they are NOT colliding on this axis
					return false;
				}
			}
			return true;
		}
		// SAT using ray axes and body axes
		return SAT(rayVertices, body.vertices, rayAxes) && SAT(rayVertices, body.vertices, body.axes);
	},

	/**
	 * Finds the static bodies around the ray from `start` to `end`. Useful for getting bodies when calling `Common.raycast` or `Common.raycastSimple`
	 * @param {vec} start - Start of ray
	 * @param {vec} end - End of ray
	 * @param {World} World - World to get bodies from
	 */
	getRayNearbyStaticBodies(start, end, World) {
		let grid = World.staticGrid;
		let size = grid.gridSize;
		let bounds = { min: start.min(end).div2(size).floor2(), max: start.max(end).div2(size).floor2() };
		bodies = new Set();

		for (let x = bounds.min.x; x <= bounds.max.x; x++) {
			for (let y = bounds.min.y; y <= bounds.max.y; y++) {
				let n = grid.pair(new vec(x, y));
				let node = grid.grid[n];

				if (node) {
					for (let body of node) {
						if (!bodies.has(body)) {
							bodies.add(body);
						}
					}
				}
			}
		}
	},
	getRayNearbyDynamicBodies(start, end, World) {
		let grid = World.dynamicGrid;
		let size = grid.gridSize;
		let bounds = { min: start.min(end).div2(size).floor2(), max: start.max(end).div2(size).floor2() };
		bodies = new Set();

		for (let x = bounds.min.x; x <= bounds.max.x; x++) {
			for (let y = bounds.min.y; y <= bounds.max.y; y++) {
				let n = grid.pair(new vec(x, y));
				let node = grid.grid[n];

				if (node) {
					for (let body of node) {
						if (!bodies.has(body)) {
							bodies.add(body);
						}
					}
				}
			}
		}
	},

	/**
	 * 
	 * @param {vec} start - Start of ray
	 * @param {vec} end - End of ray
	 * @param {Array} [bodies] - (Optional) Array of bodies to test
	 * @returns {Object} { collision: boolean, distance: Number, point: vec, body: RigidBody, verticeIndex: Number }
	 */
	raycast: function(start, end, bodies) {
		let lineIntersects = Common.lineIntersects;
		let minDist = Infinity;
		let minPt = null;
		let minBody = null;
		let minVert = -1;

		for (let i = 0; i < bodies.length; i++) {
			let body = bodies[i];
			let { vertices } = body;
			let len = vertices.length;

			for (let i = 0; i < len; i++) {
				let cur = vertices[i];
				let next = vertices[(i + 1) % len];

				let intersection = lineIntersects(start, end, cur, next);
				if (intersection) {
					let dist = intersection.sub(start).length;
					if (dist < minDist) {
						minDist = dist;
						minPt = intersection;
						minBody = body;
						minVert = i;
					}
				}
			}
		}

		return {
			collision: minPt !== null,
			distance: minDist,
			point: minPt,
			body: minBody,
			verticeIndex: minVert,
		};
	},
	raycastSimple: function(start, end, bodies) { // raycast that only tells you if there is a collision (usually faster), returns true/false
		let lineIntersectsBody = Common.lineIntersectsBody;

		for (let body of bodies) {
			let intersection = lineIntersectsBody(start, end, body);
			if (intersection) {
				return true;
			}
		}
		return false;
	},
	boundCollision: function(boundsA, boundsB) { // checks if 2 bounds { min: vec, max: vec } are intersecting, returns true/false
		return (boundsA.max.x >= boundsB.min.x && boundsA.min.x <= boundsB.max.x && 
				boundsA.max.y >= boundsB.min.y && boundsA.min.y <= boundsB.max.y);
	},
	pointInBounds: function(point, bounds) { // checks if a point { x: x, y: y } is within bounds { min: vec, max: vec }, returns true/false
		return (point.x >= bounds.min.x && point.x <= bounds.max.x && 
				point.y >= bounds.min.y && point.y <= bounds.max.y);
	},

	/**
	 * Deletes first instance of `value` from `array`
	 * @param {Array} array Array item is deleted from
	 * @param {*} value Value deleted from array
	 */
	arrayDelete(array, value) {
		let index = array.indexOf(value);
		if (index !== -1) {
			array.splice(index, 1);
		}
	}
}
