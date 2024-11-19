const World = require("../node/World.js");
const Render = require("../render/Render.js");
const DebugRender = require("../render/DebugRender.js");
const Engine = require("../physics/Engine.js");
const Common = require("../core/Common.js");
const PerformanceRender = require("../render/PerformanceRender.js");
const Ticker = require("../core/Ticker.js");
const Bodies = require("../bodies/Bodies.js");

/**
 * Handles numerous aspects of the game for you, such as the world, physics engine, rendering, ticking, and making bodies.
 */
class Game {
	static defaultOptions = {
		World: World.defaultOptions,
		Render: Render.defaultOptions,
		Engine: Engine.defaultOptions,
		Ticker: Ticker.defaultOptions,
	}

	/**
	 * Default options:
	 * ```
	 * {
	 * 	World: World.defaultOptions,
	 * 	Render: Render.defaultOptions,
	 * 	Engine: Engine.defaultOptions,
	 * 	Ticker: Ticker.defaultOptions,
	 * }
	 * ```
	 * See documentation for [World](./World.html), [Render](./Render.html), [Engine](./Engine.html), and [Ticker](./Ticker.html) for options
	 * 
	 * @param {Object} options - Options object
	 * @param {Object} [options.World] - [World options](./World.html)
	 * @param {Object} [options.Render] - [Render options](./World.html)
	 * @param {Object} [options.Engine] - [Engine options](./World.html)
	 * @param {Object} [options.Ticker] - [Ticker options](./World.html)
	 * 
	 * @example 
	 * let game = new Game({
	 * 	World: {
	 * 		gravity: new vec(0, 0),
	 * 	},
	 * 	Render: {
	 * 		background: "#ffffff",
	 * 		ySort: true,
	 * 		antialias: false,
	 * 	},
	 * 	// Engine and Ticker omitted
	 * });
	 */
	constructor(options = {}) {
		let defaults = { ...Game.defaultOptions };
		Common.merge(defaults, options, 2);
		options = defaults;

		this.World = new World(options.World);
		this.Engine = new Engine(this.World, options.Engine);
		this.Render = new Render(options.Render);
		this.Ticker = new Ticker(this, options.Ticker);
		this.Bodies = new Bodies(this);
	}
	/**
	 * Creates a debug rendering context as `this.DebugRender`. See [DebugRender](./DebugRender.html) and the [tutorial](./tutorial-05%20Debugging.html) for more information.
	 * @example
	 * // creates game.DebugRender
	 * game.createDebugRender(); 
	 * 
	 * // which we can now use here
	 * game.DebugRender.enabled.wireframes = true;
	 * game.Engine.Performance.render.enabled = true; // fps graph
	 */
	createDebugRender() {
		this.DebugRender = new DebugRender(this);

		let Performance = this.Engine.Performance;
		Performance.render = new PerformanceRender(Performance, this.Render);
	}
}
module.exports = Game;
