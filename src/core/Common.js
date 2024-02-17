const vec = require("../geometry/vec.js");

module.exports = {
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
	pair: function(x, y) { // Elegant pairing function - http://szudzik.com/ElegantPairing.pdf
		if (x > y)
			return x*x + x + y;
		return y*y + x;
	},
	unpair: function(n) {
		let z = Math.floor(Math.sqrt(n));
		let l = n - z * z;
		return l < z ? new vec(l, z) : new vec(z, l - z);
	},
	pairCommon: function(x, y) { // Elegant pairing function, but gives the same result if x/y are switched
		if (x > y)
			return x*x + x + y;
		return y*y + y + x;
	},
	getCenterOfMass(vertices) {
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
	 * @param {Number} maxDepth - The maximum depth it can copy
	 * @returns {void}
	 */
	merge: function(objA, objB, maxDepth = Infinity) {
		Object.keys(objB).forEach(option => {
			let value = objB[option];
			
			if (Array.isArray(value)) {
				objA[option] = [ ...value ];
			}
			else if (typeof value === "object" && value !== null) {
				if (maxDepth > 1) {
					if (typeof objA[option] !== "object") {
						objA[option] = {};
					}
					ter.Common.merge(objA[option], value, maxDepth - 1);
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
			return false;
		}
	},
	lineIntersectsBody: function(a1, a2, body) { // tells you if line a1->a2 is intersecting with body, returns true/false
		if (body.children.length > 0) {
			for (let child of body.children) {
				if (ter.Common.lineIntersectsBody(a1, a2, child)) {
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
	raycast: function(start, end, bodies) { // raycast that gets you all info: { boolean collision, int distance, vec point, Body body, int verticeIndex }
		let lineIntersects = ter.Common.lineIntersects;
		let minDist = Infinity;
		let minPt = null;
		let minBody = null;
		let minVert = -1;

		if (bodies === undefined) {
			let grid = World.dynamicGrid;
			let size = grid.gridSize;
			let bounds = { min: start.min(end).div2(size).floor2(), max: start.max(end).div2(size).floor2() };
			bodies = [];
	
			for (let x = bounds.min.x; x <= bounds.max.x; x++) {
				for (let y = bounds.min.y; y <= bounds.max.y; y++) {
					let n = grid.pair(new vec(x, y));
					let node = grid.grid[n];
	
					if (node) {
						for (let body of node) {
							if (!bodies.includes(body) && body.children.length === 0) {
								bodies.push(body);
							}
						}
					}
				}
			}
		}

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
		let lineIntersectsBody = ter.Common.lineIntersectsBody;

		if (bodies === undefined) {
			let grid = ter.World.staticGrid;
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
		}

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
	arrayDelete(array, value) {
		let index = this.indexOf(val);
		if (index !== -1) {
			this.splice(index, 1);
		}
	}
}
