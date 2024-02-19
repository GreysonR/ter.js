const PerformanceRender = require("../render/PerformanceRender");

/**
 * Tracks performance stats of the game, like fps, delta time, and frame number
 */
class Performance {
	getAvgs = true;
	#lastUpdate = 0;
	/**
	 * The frames per second of the engine.
	 * @type {number}
	 */
	fps = 60;
	/**
	 * The amount of time between frames in seconds.
	 * @type {number}
	 */
	delta = 1;
	/**
	 * The engine frame number. Note that this will increase much faster than the number of rendered frames when `Engine.substeps` is greater than 1.
	 * @type {number}
	 */
	frame = 0;

	history = {
		avgFps: 60,
		avgDelta: 1,
		fps: [],
		delta: [],
	}
	engine = {
		delta: 0,
		lastUpdate: 0,
	}

	/**
	 * Creates a Performance object
	 * @param {Render} Render - [Render](./Render.html)
	 */
	constructor(Render = undefined) {
		if (Render) this.render = new PerformanceRender(this, Render);
		this.#lastUpdate = performance.now() / 1000;
	}

	/**
	 * Updates the performance stats. Should be called every frame.
	 */
	update() {
		let curTime = performance.now() / 1000;
		if (curTime - this.#lastUpdate === 0) { // Instantly updating breaks everything
			return;
		}

		this.delta = Math.min(5, curTime - this.#lastUpdate);
		this.fps = 1 / this.delta;
		this.#lastUpdate = curTime;

		this.history.fps.push(this.fps);
		this.history.delta.push(this.delta);

		if (this.history.fps.length > 200) {
			this.history.fps.shift();
			this.history.delta.shift();
		}
		let fps = (() => {
			let v = 0;
			for (let i = 0; i < this.history.fps.length; i++) {
				v += this.history.fps[i];
			}
			return v / this.history.fps.length;
		})();
		let delta = (() => {
			let v = 0;
			for (let i = 0; i < this.history.delta.length; i++) {
				v += this.history.delta[i];
			}
			return v / this.history.delta.length;
		})();

		this.history.avgFps = fps;
		this.history.avgDelta = delta;
	}
};
module.exports = Performance;
