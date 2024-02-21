const RigidBody = require("../physics/RigidBody.js");
const vec = require("../geometry/vec.js");
const PolygonRender = require("../render/PolygonRender.js");
const Sprite = require("../render/Sprite.js");

/**
 * A Circle RigidBody
 * @extends RigidBody
 */
class Circle extends RigidBody {
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
	 * @param {number} radius - Radius of Circle
	 * @param {vec} position - Position of body
	 * @param {object} options - (RigidBody)[./RigidBody.html] options
	 * @param {number} [options.verticeCount] - Number of vertices in the circle
	 */
	constructor(Engine, radius, position, options = {}) {
		super(Engine, Circle.createVertices(radius, options.verticeCount), position, options);

		this.radius = radius;
		this.nodeType = "Circle";
	}
	addPolygonRender(container, options) {
		let render = new PolygonRender({
			container: container,
			position: new vec(this.position),
			vertices: this.vertices,
			subtype: "Circle",
			radius: this.radius,
			angle: this.angle,
			
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
			width:  this.radius * 2,
			height: this.radius * 2,
			angle: this.angle,
			
			...options
		});
		if (this.isAdded()) render.add();
		this.addChild(render);

		return this;
	}
}
module.exports = Circle;
