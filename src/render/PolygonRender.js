const Node = require("../node/Node.js");
const vec = require("../geometry/vec.js");
const Common = require("../core/Common.js");

module.exports = class PolygonRender extends Node {
	static defaultOptions = {
		container: null, // {PIXI Container}
		layer: 0, // {Number}
		position: new vec(0, 0), // {vec}
		angle: 0, // {Number} [0, 2PI]
		type: "polygon", // "polygon" | "rectangle" | "circle"
		vertices: [],

		visible: true,
		alpha: 1,
		background: "transparent",
		border: "transparent",
		borderWidth: 3,
		borderOffset: 0.5,
		lineCap: "butt",
		lineJoin: "miter",
		
		// type: "rectangle" only options
		width: 100,
		heigth: 100,
		round: 0,

		// type: "circle" only options
		radius: 50,
	}
	static all = new Set();

	constructor(options = {}) {
		super();
		let defaults = { ...PolygonRender.defaultOptions };
		Common.merge(defaults, options, 1);
		options = defaults;
		Common.merge(this, options, 1);

		this.create();
	}
	create() {
		let graphic = this.graphic = new PIXI.Graphics();
		let { position, angle, type, vertices } = this;
		let { layer, alpha, background, border, borderWidth, lineCap, lineJoin, borderOffset, round } = this;
		let { parseColor } = Common;
		
		background = parseColor(background);
		if (background[1] > 0) graphic.beginFill(...background);

		border = parseColor(border);
		if (border[1] > 0) {
			graphic.lineStyle({
				width: borderWidth,
				color: border[0],
				alpha: border[1],
				cap: lineCap,
				join: lineJoin,
				alignment: borderOffset,
			});
		}

		if (type === "rectangle") {
			let { width, height } = this;
			
			if (round > 0) {
				graphic.drawRoundedRect(-width/2, -height/2, width, height, round);
			}
			else {
				graphic.drawRect(-width/2, -height/2, width, height);
			}
		}
		else if (type === "circle") {
			let { radius } = this;
			graphic.drawCircle(0, 0, radius);
		}
		else { // manually draw vertices
			let center = Common.getCenterOfMass(vertices);
			graphic.drawPolygon(vertices.map(vertice => vertice.sub(center)));
			// graphic.drawPolygon(vertices);
		}
		if (border[1] > 0) graphic.closePath();
		if (background[1] > 0) graphic.endFill();
		graphic.zIndex = layer;

		// Translate to position
		let translateDelta = new vec(position);
		this.position = new vec(0, 0);
		this.translate(translateDelta);

		// Rotate to angle
		this.angle = 0;
		this.translateAngle(angle);

		// Set alpha
		this.setAlpha(alpha);

		// Trigger events
		this.trigger("load");
	}

	/**
	 * Sets the render layer (z index)
	 * @param {Number} layer - The render layer (z index) for the render
	 */
	setLayer(layer) {
		this.layer = layer;
		this.graphic.zIndex = layer;
	}

	/**
	 * Sets the render's alpha
	 * @param {Number} alpha - The opacity, between 0 and 1 inclusive
	 */
	setAlpha(alpha) {
		this.alpha = alpha;
		this.graphic.alpha = alpha;
	}

	/**
	 * Changes if the render is visible
	 * @param {Boolean} visible - If the render is visible
	 */
	setVisible(visible) {
		this.visible = visible;
		this.graphic.visible = visible;
	}

	/**
	 * Shifts the render's position by `delta`
	 * @param {vec} delta - Position render is shifted
	 */
	translate(delta) {
		super.translate(delta);

		let { graphic } = this;
		graphic.position.x += delta.x;
		graphic.position.y += delta.y;
	}

	/**
	 * Rotates the render relative to current angle
	 * @param {Number} angle - Amount to rotate render, in radians
	 */
	translateAngle(angle) {
		let { graphic } = this;
		this.angle += angle;
		graphic.rotation += angle;
	}

	/**
	 * Adds the render object to the world
	 */
	add() {
		super.add();
		PolygonRender.all.add(this);
		this.container.addChild(this.graphic);
	}
	/**
	 * Removes the render object from the world
	 */
	delete() {
		super.delete();
		PolygonRender.all.delete(this);
		this.container.removeChild(this.graphic);
	}
	
	/**
	 * Destroys the render object. Use when you know the render will no longer be used
	 */
	destroy() {
		this.graphic.destroy();
	}

	#events = {
		delete: [],
		add: [],
		load: [],
	}
}
