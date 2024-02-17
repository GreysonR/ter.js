module.exports = class DebugRender {
	// - Debug rendering
	canvas = null;
	ctx = null;
	enabled = {
		collisions: false,
		boundingBox: false,
		vertices: false,
		centers: false,
		broadphase: false,
	}

	constructor(Game) {
		this.Game = Game;

		let scale = devicePixelRatio ?? 1;
		let canvas = this.canvas = document.createElement("canvas");
		this.ctx = canvas.getContext("2d");
		canvas.style.position = "absolute";
		canvas.style.zIndex = 1;
		canvas.style.top =  "0px";
		canvas.style.left = "0px";
		canvas.width  = scale * window.innerWidth;
		canvas.height = scale * window.innerHeight;
		canvas.style.background = "transparent";
		canvas.style.pointerEvents = "none";
		canvas.style.transformOrigin = "top left";
		canvas.style.transform = `scale(${1 / scale}, ${1 / scale})`;
		document.body.appendChild(canvas);

		Game.Render.app.renderer.on("resize", (width, height) => {
			let scale = devicePixelRatio ?? 1;
			canvas.width  = width  * scale;
			canvas.height = height * scale;
			canvas.style.transform = `scale(${1 / scale}, ${1 / scale})`;
		});
	}
	update() {
		let { ctx, canvas, enabled, Game } = this;
		let { camera } = Game.Render;
		let canvWidth = canvas.width;
		let canvHeight = canvas.height;
		
		const { position:cameraPosition } = camera;
		const scale = camera.scale * devicePixelRatio;
		let translation = new vec({ x: -cameraPosition.x * scale + canvWidth/2, y: -cameraPosition.y * scale + canvHeight/2 });

		ctx.clearRect(0, 0, canvWidth, canvHeight);
		ctx.save();
		ctx.translate(translation.x, translation.y);
		ctx.scale(scale, scale);

		for (let debugType in enabled) {
			if (typeof this[debugType] === "function") {
				this[debugType]();
			}
		}
		if (enabled.broadphase === true) {
			this.broadphase();
		}
		if (enabled.boundingBox === true) {
			this.boundingBox();
		}
		if (enabled.vertices === true) {
			this.allVertices();
		}
		if (enabled.collisions === true) {
			this.allCollisions();
		}
		if (enabled.centers === true) {
			this.allCenters();
		}

		ctx.restore();
	}

	
	vertices() {
		const { Game, ctx } = this;
		const { camera } = this;
		const scale = camera.scale * devicePixelRatio;

		function renderVertices(vertices) {
			ctx.moveTo(vertices[0].x, vertices[0].y);

			for (let j = 0; j < vertices.length; j++) {
				if (j > 0) {
					let vertice = vertices[j];
					ctx.lineTo(vertice.x, vertice.y);
				}
			}

			ctx.closePath();
		}

		ctx.beginPath();
		let allBodies = Game.World.bodies;
		for (let i = 0; i < allBodies.length; i++) {
			let body = allBodies[i];
			if (body.children.length === 0) {
				renderVertices(body.vertices);
			}
		}
		ctx.lineWidth = 2 / scale;
		ctx.strokeStyle = "#FF832A";
		ctx.stroke();
	}
	collisions() {
		const { ctx, Game } = this;
		const { globalPoints, globalVectors } = Game;
		
		if (globalPoints.length > 0) { // Render globalPoints
			ctx.beginPath();
			for (let i = 0; i < globalPoints.length; i++) {
				let point = globalPoints[i];
				ctx.moveTo(point.x, point.y);
				ctx.arc(point.x, point.y, 2 / camera.scale, 0, Math.PI*2);
				ctx.fillStyle = "#e8e8e8";
			}
			ctx.fill();
		}
		if (globalVectors.length > 0) { // Render globalVectors
			ctx.beginPath();
			for (let i = 0; i < globalVectors.length; i++) {
				let point = globalVectors[i].position;
				let vector = globalVectors[i].vector;
				ctx.moveTo(point.x, point.y);
				ctx.lineTo(point.x + vector.x * 10 / camera.scale, point.y + vector.y * 10 / camera.scale);
				ctx.strokeStyle = "#FFAB2E";
				ctx.lineWidth = 3 / camera.scale;
			}
			ctx.stroke();
		}
	}
	centers() {
		const { ctx, Game } = this;
		ctx.fillStyle = "#FF832A";
		let allBodies = Game.World.bodies;
		ctx.beginPath();
		for (let i = 0; i < allBodies.length; i++) {
			let body = allBodies[i];
			if (body.children.length === 0 || true) {
				ctx.moveTo(body.position.x, body.position.y);
				ctx.arc(body.position.x, body.position.y, 2 / this.camera.scale, 0, Math.PI*2);
			}
		}
		ctx.fill();
	}
	boundingBox() {
		const { ctx, Game } = this;
		const { World } = Game;
		let allBodies = World.bodies;
		let allConstraints = World.constraints;

		ctx.strokeStyle = "#66666680";
		ctx.lineWidth = 1 / this.camera.scale;

		for (let i = 0; i < allBodies.length; i++) {
			let body = allBodies[i];
			if (!body.children || body.children.length === 0) {
				let bounds = body.bounds;
				let width  = bounds.max.x - bounds.min.x;
				let height = bounds.max.y - bounds.min.y;

				ctx.beginPath();
				ctx.strokeRect(bounds.min.x, bounds.min.y, width, height);
			}
		}
		ctx.strokeStyle = "#66666630";
		for (let i = 0; i < allConstraints.length; i++) {
			let constraint = allConstraints[i];
			let bounds = constraint.bounds;
			let width  = bounds.max.x - bounds.min.x;
			let height = bounds.max.y - bounds.min.y;

			ctx.beginPath();
			ctx.strokeRect(bounds.min.x, bounds.min.y, width, height);
		}
	}
	broadphase(tree = Game.World.dynamicGrid) {
		const { ctx } = this;
		let size = tree.gridSize;

		ctx.lineWidth = 0.4 / this.camera.scale;
		ctx.strokeStyle = "#D0A356";
		ctx.fillStyle = "#947849";
		
		Object.keys(tree.grid).forEach(n => {
			let node = tree.grid[n];
			let pos = tree.unpair(n).mult(size);
			ctx.strokeRect(pos.x, pos.y, size, size);
			ctx.globalAlpha = 0.003 * node.length;
			ctx.fillRect(pos.x, pos.y, size, size);
			ctx.globalAlpha = 1;
		});
	}
}
