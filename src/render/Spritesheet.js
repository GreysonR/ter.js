const Node = require("../node/Node");
const Common = require("../core/Common.js");
const vec = require("../geometry/vec");

/**
 * A spritesheet with animation support
 * 
 * ## Events
 * | Name | Description | Arguments |
 * | ---- | ----------- | --------- |
 * | load | Spritesheet is fully loaded and ready to use | None |
 * | add | Spritesheet is added to the renderer | None |
 * | delete | Spritesheet is removed from the renderer | None |
 * 
 * @extends Node
 */
class Spritesheet extends Node {
	static all = new Set();
	static defaultOptions = {
		container: undefined, // {PIXI Container}
		layer: 0, // number
		position: new vec(0, 0), // {vec}
		angle: 0, // number [0, 2PI]

		visible: true,
		alpha: 1,
		speed: 1 / 6,
		src: "",
		animation: "",
		
		scale: new vec(1, 1),
		width:  undefined,
		height: undefined,
	}

	
	/**
	 * Creates a new Spritesheet
	 * @param {Object} options - Spritesheet options
	 * @example
	 * // Includes all Spritesheet options
	 * new Spritesheet({
	 * 	container: game.Render.app.stage, // PIXI Container
	 * 	layer: 0,
	 * 	position: new vec(0, 0),
	 * 	angle: 0,
	 * 
	 * 	visible: true,
	 * 	alpha: 1,
	 * 	speed: 1 / 6,
	 * 	src: "",
	 * 	animation: "",
	 * 	
	 * 	scale: new vec(1, 1),
	 * 	width:  undefined, // Number | undefined
	 * 	height: undefined, // Number | undefined
	 * });
	 */
	constructor(options) {
		super();
		let defaults = { ...Spritesheet.defaultOptions };
		Common.merge(defaults, options, 1);
		options = defaults;
		Common.merge(this, options, 1);

		this.position = new vec(this.position ?? { x: 0, y: 0 });
		this.add = this.add.bind(this);

		this.create();

	}
	create() {
		let { width, height, layer, position, angle, src, animation: animationName } = this;
		const animations = PIXI.Assets.cache.get(src).data.animations;
		const frames = animations[animationName];
		if (!frames) {
			throw new Error("No animation of name " + animationName);
		}
		const sprite = PIXI.AnimatedSprite.fromFrames(animations[animationName]);
		sprite.animationSpeed = this.speed;
		this.sprite = sprite;

		this.loaded = true;
		sprite.anchor.set(0.5);

		if (width != undefined && height != undefined) {
			this.setSize(width, height);
		}

		// Update alpha
		this.setAlpha(this.alpha);

		// Update layer
		this.setLayer(layer);

		// Translate to position
		let translateDelta = new vec(position);
		this.position.set(new vec(0, 0));
		this.translate(translateDelta);
		
		// Rotate to angle
		this.angle = 0;
		this.translateAngle(angle);

		
		this.trigger("load");
	}
	/**
	 * Adds the sprite to the world
	 */
	add() {
		if (!this.sprite && this.isAdded()) {
			this.on("load", this.add);
			return;
		}

		super.add();
		this.container.addChild(this.sprite);
		Spritesheet.all.add(this);
		this.sprite.play();
	}
	/**
	 * Removes the sprite from the world
	 */
	delete() {
		super.delete();
		Spritesheet.all.delete(this);
		this.container.removeChild(this.sprite);
		this.sprite.stop();
		
		this.off("load", this.add);
	}

	/**
	 * Sets the animation's speed
	 * @param {Number} speed 
	 */
	setSpeed(speed) {
		this.speed = speed;
		this.sprite.animationSpeed = speed;
	}

	/**
	 * Sets the render layer (z index)
	 * @param {number} layer - Render layer (z index) for the render
	 */
	setLayer(layer) {
		this.layer = layer;
		if (!this.loaded) return;
		this.sprite.zIndex = layer;
	}

	/**
	 * Sets the sprite's scale
	 * @param {vec} scale - New scale
	 */
	setScale(scale) {
		this.scale.set(scale);

		if (!this.loaded) return;
		let { sprite } = this;
		sprite.scale.set(this.scale.x, this.scale.y);
		this.setSize();
	}

	/**
	 * Sets the sprite's width and height
	 * @param {number} width - New width
	 * @param {number} height - New height
	 */
	setSize(width, height) {
		if (width != undefined) this.width = width;
		if (height != undefined) this.height = height;

		if (!this.loaded) return;
		let { sprite } = this;
		sprite.width =  this.width * this.scale.x;
		sprite.height = this.height * this.scale.y;
	}

	/**
	 * Sets the sprite's alpha
	 * @param {number} alpha - Opacity, between 0 and 1 inclusive
	 */
	setAlpha(alpha) {
		this.alpha = alpha;
		if (!this.loaded) return;
		this.sprite.alpha = alpha;
	}

	/**
	 * Changes if the sprite is visible
	 * @param {boolean} visible - If the sprite is visible
	 */
	setVisible(visible) {
		this.visible = visible;
		if (!this.loaded) return;
		this.sprite.visible = visible;
	}

	/**
	 * Shifts the sprite's position by `delta`
	 * @param {vec} delta - Amount sprite is shifted by
	 */
	translate(delta) {
		super.translate(delta);

		if (!this.loaded) return;
		let { sprite } = this;
		sprite.position.x += delta.x;
		sprite.position.y += delta.y;
	}
	
	/**
	 * Rotates the sprite relative to current angle
	 * @param {number} angle - Amount to rotate sprite, in radians
	 */
	translateAngle(angle, pivot = this.position) {
		super.translateAngle(angle, pivot);

		if (!this.loaded) return;
		let { sprite } = this;
		sprite.rotation += angle;
	}
	
	/**
	 * Destroys the sprite. Use when you know the sprite will no longer be used
	 */
	destroy() {
		this.sprite.destroy();
	}


	#events = {
		load: [],
		add: [],
		delete: [],
	}
	/**
	 * Binds a function to an event
	 * @param {("load"|"add"|"delete")} event - Name of the event
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
	 * @param {("load"|"add"|"delete")} event - Name of the event
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
	 * @param {("load"|"add"|"delete")} event - Name of the event
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

module.exports = Spritesheet;
