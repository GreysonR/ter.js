const Camera = require("../render/Camera.js");
const Common = require("../core/Common.js");
const vec = require("../geometry/vec.js");

/**
 * Main render object that handles the camera, pixel ratio, resizing, what is rendered, etc
 * 
 * ## Events
 * | Name | Description | Arguments |
 * | ---- | ----------- | --------- |
 * | beforeUpdate | Before the render scene is moved to match the camera position and scale. Triggered every frame. | None |
 * | afterUpdate | After the render scene is moved to match the camera position and scale. Triggered every frame. | None |
 */
class Render {
	static defaultOptions = {
		background: "transparent",
		pixelRatio: window.devicePixelRatio ?? 1,
		ySort: false,
		resizeTo: window,
		antialias: true,
		scaleMode: PIXI.SCALE_MODES.LINEAR,
		getBoundSize: function(width, height) {
			return Math.sqrt(width * height) || 1;
		}
	}
	app = null;
	camera = null;
	pixelRatio = 1;

	/**
	 * 
	 * @param {object} options - Render options
	 * @param {string} [options.background="transparent"] - Background color, such as `"#FFFFFF00"`, `"rgb(0, 0, 0)"`, or `"transparent"`
	 * @param {number} [options.pixelRatio=devicePixelRatio] - Render resolution percent, use default unless you have a reason to change it
	 * @param {boolean} [options.ySort=false] - Whether to sort the render layer of bodies by their y coordinate
	 * @param {*} [options.resizeTo=window] - What the canvas should resize to, see PIXI.js `resizeTo` for options
	 * @param {boolean} [options.antialias=true] - If the render should have antialiasing
	 * @param {function} [options.getBoundSize=function(width, height)] - Function that determines the bound size, which is how big the view should be based on the canvas width and height
	 */
	constructor(options = {}) {
		// Test if PIXI is loaded
		try { PIXI.settings; }
		catch(err) {
			throw new Error("PIXI is not defined\nHelp: try loading pixi.js before creating a ter app");j
		}

		// Load options
		let defaults = { ...Render.defaultOptions };
		let resizeTo = options.resizeTo ?? defaults.resizeTo;
		delete options.resizeTo;
		Common.merge(defaults, options, 1);
		options = defaults;
		let { background, ySort, pixelRatio, antialias, getBoundSize, scaleMode } = options;

		// Create camera
		this.camera = new Camera();

		// Setup bound size
		this.getBoundSize = getBoundSize;

		// Set basic settings
		PIXI.settings.SCALE_MODE = scaleMode;
		let scale = PIXI.settings.RESOLUTION = this.pixelRatio = pixelRatio;
		PIXI.Filter.defaultResolution = 0;
		PIXI.Container.defaultSortableChildren = true

		// Parse background color
		background = Common.parseColor(background);

		// Create PIXI app
		let app = this.app = new PIXI.Application({
			background: background[0],
			backgroundAlpha: background[1],
			resizeTo: resizeTo ?? window,
			antialias: antialias ?? true,
		});
		document.body.appendChild(app.view);
		app.ticker.add(this.update.bind(this)); // Start render
		app.stage.filters = []; // Makes working with pixi filters easier
		app.stage.sortableChildren = true; // Important so render layers work

		// Set up pixel ratio scaling
		let view = app.view;
		view.style.transformOrigin = "top left";
		view.style.transform = `scale(${1 / scale}, ${1 / scale})`;

		// Make sure canvas stays correct size
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
		this.camera.boundSize = this.getBoundSize(width, height);
	}
	setPixelRatio(pixelRatio) {
		this.pixelRatio = pixelRatio;
		PIXI.settings.RESOLUTION = pixelRatio;
		this.setSize(this.app.screen.width, this.app.screen.height); // update bounds with new pixel ratio
	}

	/**
	 * Updates renderer and its camera. Triggers `beforeUpdate` and `afterUpdate` events on this Render.
	 * @param {number} delta - Frame time, in seconds
	 */
	update(delta) {
		delta = delta / 60; // convert to ms
		this.trigger("beforeUpdate");

		let { app, camera } = this;
		let { stage } = app;
		let { position: cameraPosition, translation, fov, boundSize } = camera;
		
		let screenSize = new vec(app.screen.width, app.screen.height);
		let fovScale = boundSize / fov;
		translation.set({ x: -cameraPosition.x * fovScale + screenSize.x/2, y: -cameraPosition.y * fovScale + screenSize.y/2 });
		camera.scale = boundSize / fov;
		
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
module.exports = Render;
