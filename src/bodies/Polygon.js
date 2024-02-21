const RigidBody = require("../physics/RigidBody.js");
const vec = require("../geometry/vec.js");
const PolygonRender = require("../render/PolygonRender.js");
const Sprite = require("../render/Sprite.js");

/**
 * A Polygon RigidBody
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
	 * @param {Engine} Engine - Engine to add to
	 * @param {Array<vec>} vertices - Vertices of polygon
	 * @param {vec} position - Position of body
	 * @param {object} options - (RigidBody)[./RigidBody.html] options
	 */
	constructor(Engine, vertices, position, options = {}) {
		super(Engine, vertices, position, options);

		this.nodeType = "Polygon";
	}
	addPolygonRender(container, options) {
		let render = new PolygonRender({
			container: container,
			position: new vec(this.position),
			vertices: this.vertices,
			subtype: "Polygon",
			
			...options
		});
		if (this.isAdded()) render.add();
		this.addChild(render);
		
		return this;
	}
	addSprite(container, options) {
		let render = new Sprite({
			container: container,
			position: new vec(this.position),
			
			...options
		});
		if (this.isAdded()) render.add();
		this.addChild(render);

		return this;
	}
}
module.exports = Polygon;
