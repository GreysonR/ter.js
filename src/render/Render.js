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
		parentElement: window,
		antialias: true,
		scaleMode: PIXI.SCALE_MODES.LINEAR,
		getBoundSize: function(width, height) {
			return Math.sqrt(width * height) || 1;
		}
	}
	app = null;
	camera = null;
	pixelRatio = 1;
	parentElement = null;
	_parentBoundingBox;

	/**
	 * 
	 * @param {object} options - Render options
	 * @param {string} [options.background="transparent"] - Background color, such as `"#FFFFFF00"`, `"rgb(0, 0, 0)"`, or `"transparent"`
	 * @param {number} [options.pixelRatio=devicePixelRatio] - Render resolution percent, use default unless you have a reason to change it
	 * @param {boolean} [options.ySort=false] - Whether to sort the render layer of bodies by their y coordinate
	 * @param {*} [options.parentElement=window] - What the canvas element will be appended to. The canvas resizes to fit this element. Only set to window if the body has `overflow: hidden`, otherwise create a wrapper element.
	 * @param {boolean} [options.antialias=true] - If the render should have antialiasing
	 * @param {boolean} [options.scaleMode=PIXI.SCALE_MODES.LINEAR] - See [PIXI.js scale modes](https://api.pixijs.io/@pixi/constants/PIXI/SCALE_MODES.html)
	 * @param {function} [options.getBoundSize=function(width, height)] - Function that determines the bound size, which is how big the view should be based on the canvas width and height
	 */
	constructor(options = {}) {
		// Test if PIXI is loaded
		try { PIXI.settings; }
		catch(err) {
			throw new Error("PIXI is not defined\nHelp: try loading pixi.js before creating a ter app");
		}

		// Load options
		let defaults = { ...Render.defaultOptions };
		let parentElement = options.parentElement ?? defaults.parentElement;
		if (parentElement === window) parentElement = document.body;
		this.parentElement = parentElement;
		delete options.parentElement;
		Common.merge(defaults, options, 1);
		options = defaults;
		let { background, ySort, pixelRatio, antialias, getBoundSize, scaleMode } = options;

		// Create camera
		this.camera = new Camera(this);

		// Setup bound size
		this.getBoundSize = getBoundSize;

		// Set basic settings
		PIXI.settings.SCALE_MODE = scaleMode;
		PIXI.settings.RESOLUTION = this.pixelRatio = pixelRatio;
		PIXI.Filter.defaultResolution = 0;
		PIXI.Container.defaultSortableChildren = true

		// Parse background color
		background = Common.parseColor(background);

		// Create PIXI app
		let app = this.app = new PIXI.Application({
			background: background[0],
			backgroundAlpha: background[1],
			resizeTo: parentElement ?? window,
			antialias: antialias ?? true,
		});
		parentElement.appendChild(app.view);
		app.ticker.add(this.update.bind(this)); // Start render
		app.stage.filters = []; // Makes working with pixi filters easier
		app.stage.sortableChildren = true; // Important so render layers work

		// Make sure canvas stays correct size
		this.#setSize(app.screen.width, app.screen.height);
		app.renderer.on("resize", this.#setSize.bind(this));

		// Set up y sorting if enabled
		if (ySort) {
			app.stage.on("sort", function beforeSort(sprite) {
				sprite.zOrder = sprite.y;
			});
		}
	}
	#getElementSize(element) {
		if (element == window) {
			return { width: window.innerWidth, height: window.innerHeight };
		}
		let boundingRect = this._parentBoundingBox = {
			top: element.offsetTop,
			left: element.offsetLeft,
			width: element.offsetWidth,
			height: element.offsetHeight,
		};
		return { width: boundingRect.width, height: boundingRect.height };
	}
	#setSize(width, height) {
		this.camera.boundSize = this.getBoundSize(width, height);

		let view = this.app.view;
		let { width: elemWidth, height: elemHeight } = this.#getElementSize(this.parentElement);
		view.style.width = elemWidth + "px";
		view.style.height = elemHeight + "px";
	}
	setPixelRatio(pixelRatio) {
		this.pixelRatio = pixelRatio;
		PIXI.settings.RESOLUTION = pixelRatio;
		this.#setSize(this.app.screen.width, this.app.screen.height); // update bounds with new pixel ratio
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
