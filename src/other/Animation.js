"use strict";

class Animation {
	/**
	 * A variety of built in ease functions to use for animations<br>
	 * See [easings.net](https://easings.net/) for animation types
	 * @static
	 * 
	 * @property {function} ease.linear
	 * 
	 * @property {function} ease.in.sine
	 * @property {function} ease.in.quadratic
	 * @property {function} ease.in.cubic
	 * @property {function} ease.in.quartic
	 * @property {function} ease.in.quintic
	 * @property {function} ease.in.exponential
	 * @property {function} ease.in.circular
	 * @property {function} ease.in.back
	 * 
	 * @property {function} ease.out.sine
	 * @property {function} ease.out.quadratic
	 * @property {function} ease.out.cubic
	 * @property {function} ease.out.quartic
	 * @property {function} ease.out.quintic
	 * @property {function} ease.out.exponential
	 * @property {function} ease.out.circular
	 * @property {function} ease.out.back
	 * 
	 * @property {function} ease.inOut.sine
	 * @property {function} ease.inOut.quadratic
	 * @property {function} ease.inOut.cubic
	 * @property {function} ease.inOut.quartic
	 * @property {function} ease.inOut.quintic
	 * @property {function} ease.inOut.exponential
	 * @property {function} ease.inOut.circular
	 * @property {function} ease.inOut.back
	 * 
	 * @example
	 * Animation.ease.in.cubic // access the cubic ease in function
	 */
	static ease = {
		/**
		 * Linear animation
		 */
		linear: x => x,
		in: {
			sine: x => 1 - Math.cos((x * Math.PI) / 2),
			quadratic: x => x ** 2,
			cubic: x => x ** 3,
			quartic: x => x ** 4,
			quintic: x => x ** 5,
			exponential: x => x === 0 ? 0 : pow(2, 10 * x - 10),
			circular: x => 1 - Math.sqrt(1 - Math.pow(x, 2)),
			back: x => { const c1 = 1.70158; const c3 = c1 + 1; return c3 * x ** 3 - c1 * x ** 2; }
		},
		out: {
			sine: x => Math.sin((x * Math.PI) / 2),
			quadratic: x => 1 - (1 - x) ** 2,
			cubic: x => 1 - Math.pow(1 - x, 3),
			quartic: x => 1 - Math.pow(1 - x, 4),
			quintic: x => 1 - Math.pow(1 - x, 5),
			exponential: x => x === 1 ? 1 : 1 - Math.pow(2, -10 * x),
			circular: x => Math.sqrt(1 - Math.pow(x - 1, 2)),
			back: x => { const c1 = 2; const c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }
		},
		inOut: {
			sine: x => -(Math.cos(Math.PI * x) - 1) / 2,
			quadratic: x => x < 0.5 ? 2 * x ** 2 : 1 - Math.pow(-2 * x + 2, 2) / 2,
			cubic: x => x < 0.5 ? 4 * x ** 3 : 1 - Math.pow(-2 * x + 2, 3) / 2,
			quartic: x => x < 0.5 ? 8 * x ** 4 : 1 - Math.pow(-2 * x + 2, 4) / 2,
			quintic: x => x < 0.5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2,
			exponential: x => x === 0 ? 0 : x === 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2,
			circular: x => x < 0.5 ? (1 - Math.sqrt(1 - Math.pow(2 * x, 2))) / 2 : (Math.sqrt(1 - Math.pow(-2 * x + 2, 2)) + 1) / 2,
			back: x => { const c1 = 1.70158; const c2 = c1 * 1.525; return x < 0.5 ? (Math.pow(2 * x, 2) * ((c2 + 1) * 2 * x - c2)) / 2 : (Math.pow(2 * x - 2, 2) * ((c2 + 1) * (x * 2 - 2) + c2) + 2) / 2; },
		}
	};

	static queued = new Set();
	static running = new Set();
	static update() {
		for (let animation of Animation.queued) {
			if (animation.getTime() >= 0) {
				Animation.queued.delete(animation);
				Animation.running.add(animation);
			}
		}
		for (let animation of Animation.running) {
			animation.tick();
		}
	}
	#running = false;
	/**
	 * Gets if the animation is currently running. Running includes any delay that the animation may have.
	 * @returns {boolean} If the animation is running
	 */
	isRunning() {
		return this.#running;
	}

	/**
	 * 
	 * @param {object} options - Animation options
	 * @param {number} [options.duration] - Duration of the animation
	 * @param {function} [options.curve] - Curve function that takes a time between [0, 1] and returns a value between [0, 1]
	 * @param {number} [options.delay] - The amount of delay before the animation starts
	 * @param {function} [options.onstop] - Function that is fired when the animation is forcibly stopped
	 * @param {function} [options.onend] - Function fired when the function completes successfully
	 * @param {function} [options.ontick] - Function fired when the animation ticks every frame. Takes a number between [0, 1] for the animation's progress.
	 * @param {World} [options.World] - World the animation should be bound to. If specified, the animation will use the world's timescale. If not, it will run independent of any world's timescale.
	 */
	constructor({ duration = 0, curve = Animation.ease.linear, delay = 0, onstop, onend, ontick, World = null }) {
		this.duration = duration;
		this.curve = curve;
		this.delay = delay;
		this.onstop = onstop;
		this.onend = onend;
		this.ontick = ontick;
		this.World = World;
	}
	/**
	 * Starts the animation
	 * @returns {Promise} Resolves when the animation completes. Resolves to true if the animation finished, false if it was stopped before it finished.
	 */
	run() {
		if (!this.#running) {
			this.#running = true;
			this.startTime = this.getTimeRaw();
			Animation.queued.add(this);
	
			let animation = this;
			return new Promise((resolve, reject) => {
				animation.resolve = resolve;
				animation.reject = reject;
			});
		}
	}
	getTimeRaw() {
		return (this.World ? this.World.time : performance.now() / 1000);
	}
	getTime() {
		return (this.World ? this.World.time : performance.now() / 1000) - this.startTime - this.delay;
	}
	tick() {
		if (!this.#running) return;

		let time = this.getTime();
		let duration = Math.max(this.duration, 0.00000000001);
		let percent = Math.max(0, Math.min(1, this.curve(time / duration)));
		if (this.ontick) this.ontick(percent);

		if (time / duration >= 1) {
			this.end();
		}
	}

	/**
	 * Stops the animation before it finishes. Triggers `onstop` and resolves promises to `false`.
	 */
	stop() {
		if (this.#running) {
			this.#running = false;
			if (this.onstop) this.onstop();
			if (this.resolve) this.resolve(false);

			Animation.queued.delete(this);
			Animation.running.delete(this);
		}
	}
	end() {
		if (this.#running) {
			this.#running = false;
			if (this.onend) this.onend();
			if (this.resolve) this.resolve(true);
		}
	}
}

module.exports = Animation
