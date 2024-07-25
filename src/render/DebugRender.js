const Game = require("../core/Game");
const CollisionShape = require("../physics/CollisionShape");

/**
 * Extra functions for debugging, such as showing all vertices, hitboxes, and collisions.
 */
class DebugRender {
	// - Debug rendering
	canvas = null;
	ctx = null;

	/**
	 * What is rendered
	 * - **enabled.vertices** - Shows wireframes of all physics bodies
	 * - **enabled.collisions** - Shows collision points and normals
	 * - **enabled.boundingBox** - Shows AABB bounding boxes for physics bodies
	 * - **enabled.centers** - Shows center of mass of all physics bodies
	 * - **enabled.broadphase** - Shows active non-static broadphase grids cells
	 * @type {object}
	 * @todo Add methods for setting these, possibly also in Game
	 * @example
	 * myGame.DebugRender.enabled.vertices = true; // Vertice rendering
	 * myGame.DebugRender.enabled.collisions = true; // Collision rendering
	 * myGame.DebugRender.enabled.boundingBox = true; // Bounding box rendering
	 * myGame.DebugRender.enabled.centers = true; // Center rendering
	 * myGame.DebugRender.enabled.broadphase = true; // Broadphase rendering
	 */
	enabled = {
		vertices: false,
		centers: false,
		collisions: false,
		broadphase: false,
		boundingBox: false,
	}

	/**
	 * Creates a debug rendering context for the game.
	 * @param {Game} Game - Game to render debug info for
	 */
	constructor(Game) {
		this.Game = Game;

		let baseCanvas = Game.Render.app.view;
		let scale = devicePixelRatio ?? 1;
		let canvas = this.canvas = document.createElement("canvas");
		this.ctx = canvas.getContext("2d");
		canvas.style.position = "absolute";
		canvas.style.zIndex = 1;
		canvas.style.top =  "0px";
		canvas.style.left = "0px";
		canvas.width  = baseCanvas.width;
		canvas.height = baseCanvas.height;
		canvas.style.background = "transparent";
		canvas.style.pointerEvents = "none";
		canvas.style.transformOrigin = "top left";
		canvas.style.transform = `scale(${1 / scale}, ${1 / scale})`;
		baseCanvas.parentNode.appendChild(canvas);

		Game.Render.app.renderer.on("resize", (width, height) => {
			let scale = devicePixelRatio ?? 1;
			canvas.width  = width  * scale;
			canvas.height = height * scale;
			canvas.style.transform = `scale(${1 / scale}, ${1 / scale})`;
		});

		this.update = this.update.bind(this);
		Game.Render.app.ticker.add(this.update);
	}
	update() {
		let { ctx, canvas, enabled, Game } = this;
		const { Render } = Game;
		const { camera, pixelRatio } = Render;
		let canvWidth = canvas.width;
		let canvHeight = canvas.height;
		
		const { position:cameraPosition } = camera;
		const scale = camera.scale * pixelRatio;
		let translation = new vec({ x: -cameraPosition.x * scale + canvWidth/2, y: -cameraPosition.y * scale + canvHeight/2 });

		ctx.clearRect(0, 0, canvWidth, canvHeight);
		this.trigger("beforeSave");
		ctx.save();
		ctx.translate(translation.x, translation.y);
		ctx.scale(scale, scale);

		this.trigger("beforeRender");
		for (let debugType in enabled) {
			if (enabled[debugType] && typeof this[debugType] === "function") {
				this[debugType]();
			}
		}
		this.trigger("afterRender");

		ctx.restore();
		this.trigger("afterRestore");
	}

	
	vertices() {
		const { Game, ctx } = this;
		const { camera, pixelRatio } = Game.Render;
		const scale = camera.scale * pixelRatio;

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
		let allBodies = Game.World.rigidBodies;
		for (let body of allBodies) {
			for (let child of body.children) {
				if (child instanceof CollisionShape) {
					renderVertices(child.vertices);
				}
			}
		}
		ctx.lineWidth = 2 / scale;
		ctx.strokeStyle = "#DF7157";
		ctx.stroke();
	}
	collisions() {
		const { ctx, Game } = this;
		const { globalPoints, globalVectors } = Game.World;
		
		if (globalPoints.length > 0) { // Render globalPoints
			ctx.beginPath();
			for (let i = 0; i < globalPoints.length; i++) {
				let point = globalPoints[i];
				ctx.moveTo(point.x, point.y);
				ctx.arc(point.x, point.y, 2.5 / camera.scale, 0, Math.PI*2);
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
				ctx.strokeStyle = "#DF7157";
				ctx.lineWidth = 3 / camera.scale;
			}
			ctx.stroke();
		}
	}
	centers() {
		const { ctx, Game } = this;
		const { camera } = Game.Render;
		ctx.fillStyle = "#DF7157";
		let allBodies = Game.World.rigidBodies;
		ctx.beginPath();
		for (let body of allBodies) {
			ctx.moveTo(body.position.x, body.position.y);
			ctx.arc(body.position.x, body.position.y, 2 / camera.scale, 0, Math.PI*2);
		}
		ctx.fill();
	}
	boundingBox() {
		const { ctx, Game } = this;
		const { World, Render } = Game;
		const { camera } = Render;
		let allBodies = World.rigidBodies;
		let allConstraints = World.constraints;

		ctx.strokeStyle = "#66666680";
		ctx.lineWidth = 1 / camera.scale;

		for (let body of allBodies) {
			for (let child of body.children) {
				if (child instanceof CollisionShape) {
					let bounds = child.bounds;
					let width  = bounds.max.x - bounds.min.x;
					let height = bounds.max.y - bounds.min.y;
		
					ctx.beginPath();
					ctx.strokeRect(bounds.min.x, bounds.min.y, width, height);
				}
			}
		}
		ctx.strokeStyle = "#66666630";
		for (let constraint of allConstraints) {
			let bounds = constraint.bounds;
			let width  = bounds.max.x - bounds.min.x;
			let height = bounds.max.y - bounds.min.y;

			ctx.beginPath();
			ctx.strokeRect(bounds.min.x, bounds.min.y, width, height);
		}
	}
	broadphase(tree = this.Game.World.dynamicGrid) {
		const { ctx, Game } = this;
		const { camera } = Game.Render;
		let size = tree.gridSize;

		ctx.lineWidth = 0.4 / camera.scale;
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

	
	#events = {
		beforeSave: [],
		beforeRender: [],
		afterRender: [],
		afterRestore: [],
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
	}
}
module.exports = DebugRender;
