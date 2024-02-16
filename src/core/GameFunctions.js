
module.exports = {
	// returns an array of index(es) that make up edges of voronoi region. 2 points if it's between 2 vertices, 1 point if it's between axes, 0 points if it's inside body
	getVoronoiRegion: function(body, point) { 
		let { vertices } = body;
		let length = vertices.length;
		for (let i = 0; i < length; i++) {
			let vertice = vertices[i];
			let nextVertice = vertices[(i + 1) % length];
			let vertToNext = nextVertice.sub(vertice);
			let axis = vertToNext.normalize();
			let normal = axis.normal();
			let vertToPoint = point.sub(vertice);


			let outside = vertToPoint.dot(normal) >= -10; // theoretically should be 0, but a bit of penetration is allowed in simulation
			let vpDotAxis = vertToPoint.dot(axis);
			let within = vpDotAxis >= 0 && vpDotAxis <= vertToNext.length;

			if (outside && within) {
				return [i, (i + 1) % length];
			}
			else { // check if between axis and lastAxis
				let lastVertice = vertices[(i - 1 + length) % length];
				let lastAxis = lastVertice.sub(vertice).normalize();
				if (vertToPoint.dot(lastAxis) < 0 && vpDotAxis < 0) {
					return [i];
				}
			}
		}
		return [];
	},
	closestPointBetweenBodies: function(bodyA, bodyB) { // returns the closest point on bodyB from the vertices of bodyA
		// should technically be run 2x for (bodyA, bodyB) and (bodyB, bodyA) to find the actual closest points
		let verticesA = bodyA.vertices;
		let verticesB = bodyB.vertices;
		let point = null;
		let minDistance = Infinity;
		for (let i = 0; i < verticesA.length; i++) {
			let verticeA = verticesA[i];
			let region = getVoronoiRegion(bodyB, verticeA);

			if (region.length > 0) {
				let projected;

				if (region.length === 1) {
					projected = new vec(verticesB[region[0]]);
				}
				else if (region.length === 2) {
					let pointBA = verticesB[region[0]];
					let pointBB = verticesB[region[1]];
					let axis = pointBB.sub(pointBA).normalize();
					projected = axis.mult(axis.dot(verticeA.sub(pointBA))).add(pointBA);	
				}

				let distance = projected.sub(verticeA).length;
				if (distance < minDistance) {
					minDistance = distance;
					point = projected;
				}
			}
		}
		return point;
	},
	closestEdgeBetweenBodies: function(bodyA, bodyB) { // returns the closest point and its normal (point and normal are only on bodyB)
		let verticesA = bodyA.vertices;
		let verticesB = bodyB.vertices;
		let point = null;
		let normal = new vec(1, 0);
		let minDistance = Infinity;
		for (let i = 0; i < verticesA.length; i++) {
			let verticeA = verticesA[i];
			let region = getVoronoiRegion(bodyB, verticeA);

			if (region.length > 0) {
				let projected;
				let curNormal;

				if (region.length === 1) {
					projected = new vec(verticesB[region[0]]);
					let prev = verticesB[(region[0] - 1 + verticesB.length) % verticesB.length];
					let next = verticesB[(region[0] + 1) % verticesB.length];
					let axisA = projected.sub(prev).normalize();
					let axisB = next.sub(projected).normalize();
					curNormal = axisA.add(axisB).normalize();
				}
				else if (region.length === 2) {
					let pointBA = verticesB[region[0]];
					let pointBB = verticesB[region[1]];
					let axis = pointBB.sub(pointBA).normalize();
					projected = axis.mult(axis.dot(verticeA.sub(pointBA))).add(pointBA);
					curNormal = axis;
				}

				let distance = projected.sub(verticeA).length;
				if (distance < minDistance) {
					minDistance = distance;
					point = projected;
					normal = curNormal.normal();
				}
			}
		}
		return {
			point: point,
			normal: normal,
		};
	},

	createGradient: function(startPosition, endPosition, colorStops = [["#ff0000ff", 0], ["#ff000000", 1]]) {
		let gradient = ctx.createLinearGradient(startPosition.x, startPosition.y, endPosition.x, endPosition.y);
		for (let colorStop of colorStops) {
			gradient.addColorStop(colorStop[1], colorStop[0]);
		}
		return gradient;
	},
	createRadialGradient: function(position, radius, colorStops = [["#ff0000ff", 0], ["#ff000000", 1]]) {
		let gradient = ctx.createRadialGradient(position.x, position.y, 0, position.x, position.y, radius);
		for (let colorStop of colorStops) {
			gradient.addColorStop(colorStop[1], colorStop[0]);
		}
		return gradient;
	},

	createElement: function(type, properties) {
		let elem = document.createElement(type);

		function addProperties(elem, properties) {
			Object.keys(properties).forEach(property => {
				if (typeof properties[property] === "object" && !Array.isArray(property) && !(properties[property] instanceof Element)) {
					addProperties(elem[property], properties[property]);
				}
				else {
					if (property === "class") {
						let classes = typeof properties[property] === "string" ? properties[property].split(" ") : properties[property];
						for (let className of classes) {
							elem.classList.add(className);
						}
					}
					else if (property === "parent") {
						properties[property].appendChild(elem);
					}
					else {
						elem[property] = properties[property];
					}
				}
			});
		}
		addProperties(elem, properties);

		return elem;
	},
	gaussianRandom: function(mean = 0, stdev = 1, random = Math.random) { // Standard Normal distribution using Box-Muller transform https://stackoverflow.com/a/36481059
		let u = 1 - random();
		let v = random();
		let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
		return z * stdev + mean;
	},
	createSeededRandom: function(seed) { // Returns function that generates numbers between [0, 1). Adaptation of https://stackoverflow.com/a/19301306
		var mask = 0xffffffff;
		var m_w = (123456789 + seed) & mask;
		var m_z = (987654321 - seed) & mask;
		
		return function() {
			m_z = (36969 * (m_z & 65535) + (m_z >> 16)) & mask;
			m_w = (18000 * (m_w & 65535) + (m_w >> 16)) & mask;
			var result = ((m_z << 16) + (m_w & 65535)) >>> 0;
			result /= 4294967296;
			return result;
		}
	},
	setCSSVariable: function(varName, value) {
		root.style.setProperty(`--${varName}`, value);
	},

	boundedRandom: function([min, max]) {
		return Math.random() * (max - min) + min;
	},
	boundedRandomPoint: function(bounds) {
		return new vec(boundedRandom([bounds.min.x, bounds.max.x]), boundedRandom([bounds.min.y, bounds.max.y]));
	},
	getMovementDirections: function(direction, threshold = 0.5) {
		direction = direction.normalize();

		let directionNames = {};
		if (direction.x > threshold) {
			directionNames.right = true;
		}
		else if (direction.x < -threshold) {
			directionNames.left = true;
		}
		if (direction.y > threshold) {
			directionNames.down = true;
		}
		else if (direction.y < -threshold) {
			directionNames.up = true;
		}
		return directionNames;
	},
	setMovementDirections: function(controls, directions) {
		for (let controlName of Object.keys(directions)) {
			controls[controlName] = directions[controlName];
		}
	},
	createTilingArea: function(areaBody, sprite) { // REMOVE and replace with its own render class
		let texture = PIXI.Texture.from(sprite);
		let { angle, position } = areaBody;
		areaBody.setAngle(0);
		let size = areaBody.bounds.max.sub(areaBody.bounds.min);
		let tiling = new PIXI.TilingSprite(texture, size.x, size.y);
		tiling.zIndex = -1;
		mainWorld.addChild(tiling);

		let spritePos = size.mult(-0.5);
		let curPosition = position.add(spritePos.rotate(angle));
		tiling.rotation = angle;
		tiling.position.set(curPosition.x, curPosition.y);
		tiling.spritePos = spritePos;

		tiling.delete = function() {
			mainWorld.removeChild(tiling);
			tiling.destroy();
		}

		areaBody.setAngle(angle);

		return tiling;
	},
}
