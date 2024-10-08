const RigidBody = require("../physics/RigidBody.js");
const vec = require("../geometry/vec.js");

/**
 * A RigidBody from a set of vertices
 * 
 * ## Events
 * See [RigidBody](./RigidBody.html)
 * 
 * @extends RigidBody
 */
class Polygon extends RigidBody {
	static createVertices(radius, verticeCount = 0) {
		verticeCount = verticeCount || Math.round(Math.pow(radius, 1/3) * 2.8);
		let angle = Math.PI * 2 / verticeCount;
		let vertices = [];
		for (let i = 0; i < verticeCount; i++) {
			vertices.push(new vec(Math.cos(angle * i + angle / 2) * radius, Math.sin(angle * i + angle / 2) * radius));
		}
		return vertices;
	}
	
	/**
	 * 
	 * @param {Game} Game - Game object the body should be simulated in; If you're creating a RigidBody from a [Game](./Game.html) object, like `game.Bodies.Polygon(...)`, then you **must omit** this parameter.
	 * @param {Array<vec>} vertices - Vertices of polygon
	 * @param {vec} position - Position of body
	 * @param {object} options - [RigidBody](./RigidBody.html) options
	 */
	constructor(Game, vertices, position, options = {}) {
		super(Game, vertices, position, options);

		this.nodeType = "Polygon";
	}
	addPolygonRender(options, container) {
		super.addPolygonRender({
			position: new vec(this.position),
			vertices: this.vertices,
			subtype: "Polygon",
			angle: this.angle,

			...options,
		}, container);
		
		return this;
	}
	addSprite(options, container) {
		super.addSprite({
			position: new vec(this.position),
			angle: this.angle,
			
			...options
		}, container);

		return this;
	}
}
module.exports = Polygon;
