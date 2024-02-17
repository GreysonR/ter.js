const Camera = require("../render/Camera.js");
const Common = require("../core/Common.js");
const vec = require("../geometry/vec.js");

module.exports = class Render {
	static defaultOptions = {
		background: false,
		pixelRatio: window.devicePixelRatio ?? 1,
		ySort: false,
		resizeTo: window,
		antialias: true,
	}
	app = null;
	camera = null;
	pixelRatio = 1;
	nodes = new Set();
	constructor(options = {}) {
		let defaults = { ...Render.defaultOptions };
		let resizeTo = options.resizeTo ?? defaults.resizeTo;
		delete options.resizeTo;
		Common.merge(defaults, options, 1);
		options = defaults;

		// Create camera
		this.camera = new Camera();

		let { background, ySort, pixelRatio, antialias } = options;
		
		// Set basic settings
		let scale = PIXI.settings.RESOLUTION = PIXI.settings.FILTER_RESOLUTION = this.pixelRatio = pixelRatio;
		PIXI.Container.defaultSortableChildren = true
		
		// Create PIXI app
		let app = this.app = new PIXI.Application({
			background: background ?? 0x0,
			backgroundAlpha: (background && background != "transparent") ? 1 : 0,
			resizeTo: resizeTo ?? window,
			antialias: antialias ?? true,
		});
		document.body.appendChild(app.view);
		app.ticker.add(this.update.bind(this)); // Start rendedr
		app.stage.filters = []; // Makes working with filters easier
		app.stage.sortableChildren = true; // Important to make sure render layers work

		// Set up pixel ratio scaling
		let view = app.view;
		view.style.transformOrigin = "top left";
		view.style.transform = `scale(${1 / scale}, ${1 / scale})`;

		this.setSize(app.screen.width, app.screen.height);
		app.renderer.on("resize", this.setSize.bind(this));

		// Set up y sorting if enabled
		if (ySort) {
			app.stage.on("sort", function beforeSort(sprite) {
				sprite.zOrder = sprite.y;
			});
		}
	}
	setSize(width, height) {
		let pixelRatio = this.pixelRatio;
		this.camera.boundSize = (Math.sqrt(width ** 2 + height ** 2) || 1) * pixelRatio;
	}
	setPixelRatio(pixelRatio) {
		this.pixelRatio = pixelRatio;
		this.setSize(this.app.screen.width, this.app.screen.height); // update bounds with new pixel ratio
	}

	/**
	 * Adds all `children` to this Render
	 * @param {...Renderable} children - The children to be added
	 */
	addChild(...children) {
		for (let child of children) {
			this.nodes.add(child);
		}
	}
	/**
	 * Removes all `children` from this Render
	 * @param {...Renderable} children - The children to be removed
	 */
	removeChild(...children) {
		for (let child of children) {
			this.nodes.delete(child);
		}
	}

	/**
	 * Updates renderer, its camera, and all render nodes attached to it. Triggers `beforeUpdate` and `afterUpdate` events on this Render. Also triggers `render` on nodes
	 */
	update() {
		this.trigger("beforeUpdate");

		let { app, camera } = this;
		let { stage } = app;
		let { position: cameraPosition, translation, fov, boundSize } = camera;
		
		let screenSize = new vec(app.screen.width, app.screen.height);
		translation.set({ x: -cameraPosition.x * boundSize/fov + screenSize.x/2, y: -cameraPosition.y * boundSize/fov + screenSize.y/2 });
		camera.scale = boundSize / fov;

		for (let node of this.nodes) {
			if (node.render.graphic) {
				node.render.graphic.update();
				node.trigger("render");
			}
		}
		
		// update camera position
		stage.x = translation.x;
		stage.y = translation.y;
		stage.scale.x = camera.scale;
		stage.scale.y = camera.scale;

		this.trigger("afterUpdate");
	}

	// - Events
	#events = {
		beforeUpdate: [],
		afterUpdate: [],
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
