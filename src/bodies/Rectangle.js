const RigidBody = require("../physics/RigidBody.js");
const vec = require("../geometry/vec.js");
const PolygonRender = require("../render/PolygonRender.js");
const Sprite = require("../render/Sprite.js");

/**
 * A rectangle RigidBody
 * @extends RigidBody
 */
class Rectangle extends RigidBody {
	static createVertices(width, height) {
		return [
			new vec(-width/2,  height/2),
			new vec( width/2,  height/2),
			new vec( width/2, -height/2),
			new vec(-width/2, -height/2),
		];
	}

	/**
	 * 
	 * @param {Game} Game - Game object the body should be simulated in; If you're creating a RigidBody from a [Game](./Game.html) object, like `game.Bodies.Rectangle(...)`, then you **must omit** this parameter.
	 * @param {number} width - Width of rectangle
	 * @param {number} height - Height of rectangle
	 * @param {vec} position - Position of body
	 * @param {object} options - [RigidBody](./RigidBody.html) options
	 */
	constructor(Game, width, height, position, options = {}) {
		super(Game, Rectangle.createVertices(width, height), position, options);

		this.width = width;
		this.height = height;
		this.nodeType = "Rectangle";
	}
	addPolygonRender(options, container) {
		super.addPolygonRender({
			position: new vec(this.position),
			vertices: this.vertices,
			subtype: "Rectangle",
			width: this.width,
			height: this.height,
			angle: this.angle,

			...options,
		}, container);
		
		return this;
	}
	addSprite(options, container) {
		super.addSprite({
			position: new vec(this.position),
			width: this.width,
			height: this.height,
			
			...options
		}, container);

		return this;
	}
}
module.exports = Rectangle;
