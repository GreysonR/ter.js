const RenderMethods = require("../render/RenderMethods");
const vec = require("../geometry/vec");

/**
 * Handles rendering performance stats. Creates a graph in the top corner of the screen.
 */
class PerformanceRender {
	/**
	 * If the graph is enabled
	 * @type {boolean}
	 */
	enabled = false;
	canvas;
	ctx;
	position = new vec(20, 20);

	/**
	 * 
	 * @param {Performance} Performance - [Performance](./Performance.html)
	 * @param {Render} Render - [Render](./Render.html)
	 */
	constructor(Performance, Render) {
		this.Performance = Performance;

		// Create canvas
		const width  = this.width  = 100;
		const height = this.height = 50;
		let scale = this.scale = devicePixelRatio ?? 1;
		let canvas = this.canvas = document.createElement("canvas");
		this.ctx = canvas.getContext("2d");
		canvas.style.position = "absolute";
		canvas.style.zIndex = "2";
		canvas.style.top =  "20px";
		canvas.style.right = "0px";
		canvas.style.left = "unset";
		canvas.width =  scale * width;
		canvas.height = scale * height;
		canvas.style.background = "transparent";
		canvas.style.pointerEvents = "none";
		canvas.style.transformOrigin = "top left";
		canvas.style.transform = `scale(${1 / scale}, ${1 / scale})`;
		document.body.appendChild(canvas);

		// Set up rendering
		this.update = this.update.bind(this);
		Render.app.ticker.add(this.update);
	}
	update() {
		let { canvas, ctx, enabled, Performance, scale, width, height } = this;
		let { history } = Performance;

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		if (enabled) {
			ctx.save();
			ctx.scale(scale, scale);

			// background
			ctx.beginPath();
			RenderMethods.roundedRect(width, height, new vec(width/2, height/2), 5, ctx);
			ctx.fillStyle = "#0D0D0De6";
			ctx.fill();


			// get fps stats
			let maxFps = 0;
			let minFps = Infinity;
			let avgFps = (() => {
				let v = 0;
				for (let i = 0; i < history.fps.length; i++) {
					let cur = history.fps[i];
					v += cur;
					maxFps = Math.max(maxFps, cur);
					minFps = Math.min(minFps, cur);
				}
				return v / history.fps.length;
			})();
			let nearAvgFps = (() => {
				let v = 0;
				let n = Math.min(history.fps.length, 20);
				for (let i = 0; i < n; i++) {
					let cur = history.fps[i];
					v += cur;
				}
				return v / n;
			})();

			// fps text
			ctx.beginPath();
			ctx.fillStyle = "white";
			ctx.textAlign = "right";
			ctx.font = `400 ${12}px Arial`;
			ctx.fillText(`${Math.round(nearAvgFps)} fps`, width - 12, 5 + 12);

			
			if (history.fps.length > 10) { // fps graph
				let range = 100;
				let fpsRanges = {
					min: Math.max(0, Math.min(minFps, avgFps - range)),
					max: Math.max(maxFps, avgFps + range, 60),
				}
				const fpsRange = fpsRanges.max - fpsRanges.min;
				let bounds = {
					min: new vec(10, 18),
					max: new vec(width - 10, height - 4),
				};

				ctx.beginPath();
				function getPosition(point, i) {
					let x = bounds.max.x - (i / history.fps.length) * (bounds.max.x - bounds.min.x);
					let y = bounds.max.y - ((point - fpsRanges.min) / fpsRange) * (bounds.max.y - bounds.min.y);
					return [x, y];
				}
				ctx.moveTo(...getPosition(history.fps[0], 0))
				for (let i = 1; i < history.fps.length; i++) {
					ctx.lineTo(...getPosition(history.fps[i], i));
				}
				ctx.lineWidth = 1;
				ctx.lineJoin = "bevel";
				ctx.strokeStyle = "#9C9C9C";
				ctx.stroke();
			}

			// colored rect
			ctx.beginPath();
			let colors = [[0.75, "#3FF151"], [0.5, "#F5ED32"], [0.25, "#F89A2C"], [0, "#F74D4D"]];
			let boundMax = 60;
			ctx.fillStyle = "#808080";
			for (let color of colors) {
				if (avgFps >= color[0] * boundMax) {
					ctx.fillStyle = color[1];
					break;
				}
			}
			RenderMethods.roundedRect(6, 6, new vec(15, 13), 2, ctx);
			ctx.fill();
			
			
			ctx.restore();
		}
	}
}
module.exports = PerformanceRender;
