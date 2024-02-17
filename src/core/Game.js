const World = require("../node/World.js");
const Render = require("../render/Render.js");
const Engine = require("../physics/Engine.js");
const Common = require("../core/Common.js");

module.exports = class Game {
	static defaultOptions = {
		World: World.defaultOptions,
		Render: Render.defaultOptions,
		Engine: Engine.defaultOptions,
	}

	globalPoints = [];
	globalVectors = [];

	constructor(options = {}) {
		let defaults = { ...Game.defaultOptions };
		Common.merge(defaults, options);
		options = defaults;

		this.Engine = new Engine(options.Engine);
		this.Render = new Render(options.Render);
		this.World = new World(options.World);
	}
}
