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
	 */
	constructor(options = {}) {
		let defaults = { ...Game.defaultOptions };
		Common.merge(defaults, options, 2);
		options = defaults;

		this.World = new World(options.World);
		this.Engine = new Engine(this.World, options.Engine);
		this.Render = new Render(options.Render);
		this.Ticker = new Ticker(this, options.Ticker);
		this.Bodies = Bodies.createBodyFactory(this.Engine);
		
		setTimeout(() => {
			window.scrollTo(0, 0);
		}, 0);
	}
	/**
	 * Creates a debug rendering context as `this.DebugRender`. See [DebugRender](./DebugRender.html) for more information.
	 */
	createDebugRender() {
		this.DebugRender = new DebugRender(this);

		let Performance = this.Engine.Performance;
		Performance.render = new PerformanceRender(Performance, this.Render);
		Performance.render.enabled = true;
	}
}
module.exports = Game;
