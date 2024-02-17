const PerformanceRender = require("../render/PerformanceRender");

module.exports = class Performance {
	getAvgs = true;
	lastUpdate = 0;
	fps = 60;
	delta = 1;
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
	 * Creates a performance tracker
	 * @param {Render} Render - Optional Render object to create a performance render
	 */
	constructor(Render = undefined) {
		if (Render) this.render = new PerformanceRender(this, Render);
		this.lastUpdate = performance.now() / 1000;
	}
	update() {
		let curTime = performance.now() / 1000;
		if (curTime - this.lastUpdate === 0) {
			return;
		}

		this.delta = Math.min(5, curTime - this.lastUpdate);
		this.fps = 1 / this.delta;
		this.lastUpdate = curTime;

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
