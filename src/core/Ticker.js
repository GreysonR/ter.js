const Common = require("../core/Common.js");
const Animation = require("../other/Animation.js");

/**
 * A game ticker that handles updating the engine every frame.
 * 
 * ## Events
 * | Name | Description | Arguments |
 * | ---- | ----------- | --------- |
 * | beforeTick | Triggered at the start of every frame | None |
 * | afterTick | Triggered at the end of every frame | None |
 */
class Ticker {
	static defaultOptions = {
		enabled: true,
		pauseOnFreeze: true,
		freezeThreshold: 0.3,
	}

	#enabled = true;

	/**
	 * Creates a ticker that updates [Game](./Game.html) every frame.
	 * @param {Game} Game - Game ticker should be run on
	 * @param {Object} options - Options object
	 * @param {boolean} [options.enabled=true] - If the ticker runs. To start the ticker again, use `ticker.run()`
	 * @param {boolean} [options.pauseOnFreeze=true] - If the ticker should pause when the game freezes. Helps prevent jumping when user switches tabs.
	 * @param {number} [options.freezeThreshold=0.3] - The threshold before the game pauses **between 0 and 1**. Higher values means the fps doesn't have to dip as low for the ticker to pause.
	 */
	constructor(Game, options = {}) {
		let defaults = { ...Ticker.defaultOptions };
		Common.merge(defaults, options, 1);
		options = defaults;
		
		this.Game = Game;
		this.#enabled = options.enabled;
		this.pauseOnFreeze   = options.pauseOnFreeze;
		this.freezeThreshold = options.freezeThreshold;

		this.tick = this.tick.bind(this);
		if (this.#enabled) {
			window.addEventListener("load", this.tick);
		}
	}
	/**
	 * Starts a stopped ticker
	 */
	start() {
		if (this.#enabled) return;
		this.#enabled = true;
		this.tick();
	}
	/**
	 * Stops a running ticker. This will stop physics, performance, and animation updates, but will not stop the renderer.
	 */
	stop() {
		if (!this.#enabled) return;
		this.#enabled = false;
	}
	tick() {
		if (!this.#enabled) return;

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

		Animation.update();
		this.trigger("afterTick");
		requestAnimationFrame(this.tick);
		// setTimeout(this.tick, 16);
	}
	
	#events = {
		beforeTick: [],
		afterTick: [],
	}
	/**
	 * Binds a function to an event
	 * @param {("beforeTick"|"afterTick")} event - Name of the event
	 * @param {function} callback - Function called when event fires
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
	 * Unbinds a function from an event
	 * @param {("beforeTick"|"afterTick")} event - Name of the event
	 * @param {function} callback - Function bound to event
	 */
	off(event, callback) {
		event = this.#events[event];
		if (event.includes(callback)) {
			event.splice(event.indexOf(callback), 1);
		}
	}
	/**
	 * Fires an event
	 * @param {("beforeTick"|"afterTick")} event - Name of the event
	 */
	trigger(event) {
		// Trigger each event
		if (this.#events[event]) {
			this.#events[event].forEach(callback => {
				callback();
			});
		}
	}
}
module.exports = Ticker;
