const RigidBody = require("../physics/RigidBody.js");

const types = {
	Rectangle: require("../bodies/Rectangle.js"),
	Circle: require("../bodies/Circle.js"),
	RegularPolygon: require("../bodies/RegularPolygon.js"),
	Polygon: require("../bodies/Polygon.js"),
}

class Bodies {
	constructor(Game) {
		let bodies = this;
		for (let type of Object.keys(types)) {
			bodies[type] = function(...args) {
				return new types[type](Game, ...args);
			}
		}
	}
}

module.exports = Bodies;
