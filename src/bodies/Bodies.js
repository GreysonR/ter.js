const RigidBody = require("../physics/RigidBody.js");

const Bodies = module.exports;

Bodies.RigidBody = require("../physics/RigidBody.js");
Bodies.Rectangle = require("../bodies/Rectangle.js");
Bodies.Circle = require("../bodies/Circle.js");
Bodies.RegularPolygon = require("../bodies/RegularPolygon.js");
Bodies.Polygon = require("../bodies/Polygon.js");

Bodies.createBodyFactory = function(Engine) {
	let factory = {};
	for (let type in Bodies) {
		if (type === "RigidBody") continue;
		if (Bodies[type].prototype instanceof RigidBody || Bodies[type] === RigidBody) {
			factory[type] = function(...args) {
				return new Bodies[type](Engine, ...args);
			}
		}
	}
	return factory;
}
