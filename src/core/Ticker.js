const Common = require("../core/Common.js");

module.exports = class Ticker {
	static defaultOptions = {
		pauseOnFreeze: true,
		freezeThreshold: 0.3,
	}

	/**
	 * Creates a ticker that runs on `Game` every frame.
	 * @param {Game} Game Game ticker should be run on
	 * @param {Object} options Options object, see documentation for options
	 */
	constructor(Game, options = {}) {
		let defaults = { ...Ticker.defaultOptions };
		Common.merge(defaults, options, 1);
		options = defaults;
		
		this.Game = Game;
		this.pauseOnFreeze   = options.pauseOnFreeze;
		this.freezeThreshold = options.freezeThreshold;

		this.tick = this.tick.bind(this);
		window.addEventListener("load", this.tick);
	}
	tick() {
		this.trigger("beforeTick");

		const { Engine } = this.Game;
		const { Performance } = Engine;
		if (this.pauseOnFreeze && Performance.fps / Math.max(1, Performance.history.avgFps) < this.freezeThreshold) {
			Performance.update();
		}
		else {
			Engine.update();
			// animations.run();
		}

		this.trigger("afterTick");
		requestAnimationFrame(this.tick);
	}
	
	#events = {
		beforeTick: [],
		afterTick: [],
	}
	on(event, callback) {
		if (this.#events[event]) {
			this.#events[event].push(callback);
		}
		else {
			console.warn(event + " is not a valid event");
		}
	}
	off(event, callback) {
		event = this.#events[event];
		if (event.includes(callback)) {
			event.splice(event.indexOf(callback), 1);
		}
	}
	trigger(event) {
		// Trigger each event
		if (this.#events[event]) {
			this.#events[event].forEach(callback => {
				callback();
			});
		}
	}
}
