"use strict";

class NavmeshNode {
	static id = 0;
	constructor(position) {
		this.position = position;
		this.neighbors = [];
		this.neighborDistances = [];

		this.g = 0;
		this.f = 0;
		this.parent = null;
		this.id = NavmeshNode.id++;
	}
	updateF(endPoint) {
		this.f = this.g + this.position.sub(endPoint).length;
	}
	addNeighbor(neighbor) {
		let neighbors = this.neighbors;
		if (!neighbors.includes(neighbor)) {
			neighbors.push(neighbor);
			this.neighborDistances.push(this.position.sub(neighbor.position).length);
		}
	}
	removeNeighbor(neighbor) {
		let i = this.neighbors.indexOf(neighbor);
		if (i > -1) {
			this.neighbors.splice(i, 1);
			this.neighborDistances.splice(i, 1);
		}
	}
	delete() {
		for (let neighbor of this.neighbors) {
			neighbor.removeNeighbor(this);
		}
	}
	reset() {
		this.g = 0;
		this.f = 0;
		this.parent = null;
	}
}

class Navmesh {
	constructor(size = 500, margin = 50) {
		this.nodeIds = new Set();
		this.polygons = [];
		this.nodes = {};
		this.grid = new Grid(size);
		this.polygonGrid = new Grid(this.grid.gridSize);
		this.margin = margin;
		
		/*
		Render.on("afterRender", () => {
			// return;
			// console.time();
			let path = this.getPath(new vec(player.body.position), new vec(2765, 4000), Render.navmeshArrows);
			// console.timeEnd();
			if (Render.navmeshArrows || true) {
				this.renderPolygons();
				this.renderNodes();
				this.render(path ?? []);
			}
		});/**/
	}
	addNode(node, permanent = true) {
		const { nodeIds, nodes, grid } = this;
		let id = node.id
		if (!nodeIds.has(id)) {
			nodes[id] = node;
			nodeIds.add(id);
			grid.addPoint(node);
			
			this.connectNode(node, permanent);
		}
	}
	deleteNode(node) {
		let id = node.id;
		this.nodeIds.delete(id);
		delete this.nodes[id];
		this.grid.removePoint(node);
		node.delete();
	}
	getBodyWind(body) {
		if (body.children.length === 0) return 1; // if no children, assume already CCW
		if (body.wind) return body.wind; // return cached result

		function getWind(vertices) {
			let lastAngle = body.position.sub(vertices[0]).angle;
			let angleDiff = Common.angleDiff;
			let totalWind = 0;
			for (let i = 1; i < vertices.length; i++) {
				let angle = body.position.sub(vertices[i]).angle;
				totalWind += angleDiff(angle, lastAngle);
				lastAngle = angle;
			}
			return totalWind;
		}

		let totalWind = 0;
		for (let child of body.children) {
			totalWind += getWind(child.vertices);
		}
		body.wind = Math.sign(totalWind); // cache result
		return body.wind;
	}
	createExpandedBody(body, margin = this.margin - 10) {
		let wind = this.getBodyWind(body);
		let newVertices = [];
		let vertices = body.vertices;
		for (let i = 0; i < vertices.length; i++) {
			let vertice = vertices[i];

			let nextVertice = vertices[(i + 1) % vertices.length];
			let prevVertice = vertices[(i - 1 + vertices.length) % vertices.length];
			let prevDiff = vertice.sub(prevVertice).normalize();
			let nextDiff = vertice.sub(nextVertice).normalize();
			let normal = prevDiff.add(nextDiff).normalize2().mult2(margin * wind);
			if (prevDiff.cross(nextDiff) > 0) normal.mult2(-1);

			newVertices.push(vertice.add(normal));
		}

		return Bodies.fromVertices(newVertices, body.position, {
			removed: true,
		});
	}
	addBody(body, vertices = [], parent = null, expand = true) {
		let wind = this.getBodyWind(body);
		let nodes = [];
		let parentOffset = parent ? parent.position : new vec(0, 0);

		if (vertices.length === 0) {
			vertices = body.vertices;
		}
		
		let expandedBody;
		if (expand) expandedBody = this.createExpandedBody(body);
		else expandedBody = body;

		if (expandedBody.children.length > 0) {
			for (let child of expandedBody.children) {
				this.polygonGrid.addBody(child);
				this.polygons.push(child);
			}

			for (let child of expandedBody.children) {
				this.addBody(child, body.vertices, body, false);
			}
			return;
		}

		expandedBody.originalBody = parent ? parent : body;
		expandedBody.associatedNodes = nodes;

		if (expand) {
			this.polygonGrid.addBody(expandedBody);
			this.polygons.push(expandedBody);
		}

		let margin = this.margin * 1;
		for (let i = 0; i < vertices.length; i++) {
			let vertice = vertices[i];

			let nextVertice = vertices[(i + 1) % vertices.length];
			let prevVertice = vertices[(i - 1 + vertices.length) % vertices.length];
			let prevDiff = vertice.sub(prevVertice).normalize();
			let nextDiff = vertice.sub(nextVertice).normalize();
			let normal = prevDiff.add(nextDiff).normalize2().mult2(margin);
			if (prevDiff.cross(nextDiff) > 0) normal.mult2(-1);

			let node = new NavmeshNode(vertice.add(normal).add(parentOffset));
			nodes.push(node);
			this.addNode(node);
		}

		return expandedBody;
	}
	connectNode(node) {
		const { raycastSimple: raycast } = Common;
		const { grid, polygonGrid } = this;
		let vertice = node.position;
		let bucketPos = node.position.div(grid.gridSize).floor2();
		let polygonBucketIds = polygonGrid.getBucketIds({
			min: bucketPos.sub(1),
			max: bucketPos.add(1),
		});
		let polygons = [];
		for (let bucketId of polygonBucketIds) {
			let bucket = polygonGrid.grid[bucketId];
			polygons.push(...bucket);
		}
		
		let bucketIds = grid.getBucketIds({
			min: bucketPos.sub(1),
			max: bucketPos.add(1),
		});
		for (let bucketId of bucketIds) {
			let bucket = grid.grid[bucketId];

			for (let nodeB of bucket) {
				if (nodeB === node) continue;
				let dist = nodeB.position.sub(node.position).length;
				if (dist >= this.grid.gridSize) continue;
				let collision = raycast(vertice, nodeB.position, polygons);	
				if (!collision) {
					node.addNeighbor(nodeB);
					nodeB.addNeighbor(node);
				}
			}
		}

		if (node.neighbors.length === 0) { // still has no neighbors, probably inside a body
			// find body it's inside
			let body;
			for (let polygon of polygons) {
				if (polygon.containsPoint(node.position)) {
					body = polygon;
					break;
				}
			}
			// connect all nodes to this node that don't pass through body
			if (body && body.associatedNodes) {
				let originalBody = body.originalBody;
				if (originalBody.parent) originalBody = originalBody.parent;

				for (let nodeB of body.associatedNodes) {
					let collision = raycast(vertice, nodeB.position, [originalBody]); // assumes only original body can be in the way, can break for concave bodies
					if (!collision) {
						node.addNeighbor(nodeB);
						nodeB.addNeighbor(node);
					}
				}
			}
		}
	}
	getNeighbors(node, endPoint) { // g = path length, f = length to end
		let nodes = [];

		for (let i = 0; i < node.neighbors.length; i++) {
			let neighbor = node.neighbors[i];
			let g = node.g + node.neighborDistances[i];
			if (!neighbor.parent || g < neighbor.g) {
				neighbor.g = g;
				neighbor.parent = node;
				neighbor.updateF(endPoint);
	
				nodes.push(neighbor);
			}
		}

		return nodes;
	}
	constructPath(node, startNode) {
		let path = [];
		while (node.parent && node !== startNode) {
			path.push(node.position);
			node = node.parent;
		}
		path.push(node.position);
		return path.reverse();
	}
	getPath(start, end, render = false) { // A*
		const { getNeighbors, constructPath, nodes, nodeIds } = this;
		let open = [];
		let openIds = [];
		let closed = new Set();
		let closedNodes = [];

		// add start node
		let startNode = new NavmeshNode(start);
		this.addNode(startNode, false);

		if (startNode.neighbors.length === 0) {
			this.deleteNode(startNode);
			return [];
		}
		
		// add end node
		let endNode = new NavmeshNode(end);
		this.addNode(endNode, false);

		if (render) this.renderNodes();

		// add start to open
		open.push(startNode);

		let n = 0;
		while (open.length > 0 && n < 10000) {
			n++;
			
			let curNode = open.pop();
			let cid = curNode.id;
			closed.add(cid);
			closedNodes.push(curNode);
			openIds.delete(cid);

			if (curNode === endNode) { // found path
				closedNodes.push(curNode);

				// Render.on("beforeLayer0", () => {
				// 	ctx.beginPath();
				// 	for (let j = 0; j < closedNodes.length; j++) {
				// 		let vertice = closedNodes[j].position;
				// 		ctx.moveTo(vertice.x, vertice.y);
				// 		ctx.arc(vertice.x, vertice.y, 6, 0, Math.PI*2);
				// 	}
				// 	ctx.fillStyle = "red";
				// 	ctx.fill();
				// });

				let path = constructPath(curNode, startNode);

				// reset nodes to default
				for (let id of nodeIds) {
					let node = nodes[id];

					if (node) {
						node.reset();
					}
				}
				this.deleteNode(startNode);
				this.deleteNode(endNode);

				return path;
			}

			// update neighbors
			let neighbors = getNeighbors(curNode, end);

			for (let n = 0; n < neighbors.length; n++) {
				let neighbor = neighbors[n];
				let nid = neighbor.id;

				if (closed.has(nid)) {
					continue;
				}

				if (!openIds.includes(nid)) {
					open.push(neighbor);
					openIds.push(nid);
				}
				else {
					// get existing neighbor
					let existingNeighbor = nodes[nid];

					if (existingNeighbor) {
						if (neighbor.g < existingNeighbor.g) { // this is a better path, update existing node
							existingNeighbor.g = neighbor.g;
							existingNeighbor.parent = curNode;
							existingNeighbor.polygon = neighbor.polygon;
						}
					}
					else { // it shouldn't get here
						console.warn("missing nid: " + nid, neighbor);
						openIds.delete(nid);
					}
				}
			}
			
			open.sort((a, b) => b.f - a.f);
		}

		// reset nodes to default
		for (let node of closedNodes) {
			node.reset();
		}
		for (let id of openIds) {
			let node = nodes[id];
			if (node) {
				node.reset();
			}
		}
		this.deleteNode(startNode);
		this.deleteNode(endNode);

		return [];
	}
	renderPolygons() {
		let polygons = this.polygons;

		// polygons
		ctx.beginPath();
		for (let polygon of polygons) {
			Render.vertices(polygon.vertices);

			for (let j = 0; j < polygon.vertices.length; j++) {
				let vertice = polygon.vertices[j];
				ctx.moveTo(vertice.x, vertice.y);
				ctx.arc(vertice.x, vertice.y, 3, 0, Math.PI*2);
			}
			ctx.closePath();
		}
		ctx.setLineDash([]);
		ctx.strokeStyle = "#83ABD0";
		ctx.lineWidth = 3;
		ctx.stroke();
	}
	renderNodes() {
		let nodes = Object.values(this.nodes);

		ctx.lineWidth = 2;
		ctx.strokeStyle = "#98A54C";
		ctx.beginPath();
		for (let i = 0; i < nodes.length; i++) {
			let node = nodes[i];
			let pos = node.position;

			// node
			ctx.moveTo(pos.x, pos.y);
			ctx.arc(pos.x, pos.y, 5, 0, Math.PI*2);
			
			// arrows between neighbors
			if (Render.navmeshArrows) {
				for (let i = 0; i < node.neighbors.length; i++) {
					let neighbor = node.neighbors[i];
					let dir = neighbor.position.sub(node.position).normalize().mult(node.neighborDistances[i] * 0.5);
					dir.sub2(dir.normalize().mult(5));
					Render.arrow(node.position, dir, 10);
				}
			}
		}
		ctx.stroke();
	}
	render(path) {
		if (path.length > 0) {
			// line
			ctx.beginPath();
			ctx.moveTo(path[0].x, path[0].y);
			for (let j = 1; j < path.length; j++) {
				let vertice = path[j];
				ctx.lineTo(vertice.x, vertice.y);
			}
			ctx.lineWidth = 8 / camera.scale;
			ctx.strokeStyle = "#AA5E87ff";
			ctx.stroke();

			// points
			ctx.beginPath();
			for (let j = 0; j < path.length; j++) {
				let vertice = path[j];
				ctx.moveTo(vertice.x, vertice.y);
				ctx.arc(vertice.x, vertice.y, 5, 0, Math.PI*2);
			}
			ctx.strokeStyle = "#D27AAA";
			ctx.stroke();
		}
	}
}
