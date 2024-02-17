const RigidBody = require("../physics/RigidBody.js");
const vec = require("../geometry/vec.js");

module.exports = class Rectangle extends RigidBody {
	static createVertices(width, height) {
		return [
			new vec(-width/2,  height/2),
			new vec( width/2,  height/2),
			new vec( width/2, -height/2),
			new vec(-width/2, -height/2),
		];
	}
	constructor(width, height, position, options, Engine) {
		// constructor(vertices, position, Engine, options = {}) {
		super(Rectangle.createVertices(width, height), position, options, Engine);
	}
}
