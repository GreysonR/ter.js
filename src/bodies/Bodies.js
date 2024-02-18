const Bodies = module.exports;
const { isClass } = require("../core/Common.js");

Bodies.RigidBody = require("../physics/RigidBody.js");
Bodies.Rectangle = require("../bodies/Rectangle.js");

Bodies.createBodyFactory = function(Engine) {
	let factory = {};
	for (let type in Bodies) {
		if (isClass(Bodies[type])) {
			factory[type] = function(...args) {
				return new Bodies[type](Engine, ...args);
			}
		}
	}
	return factory;
}
