const Bodies = module.exports;
const { isClass } = require("../core/Common.js");
const vec = require("../geometry/vec.js");

Bodies.rigidBody = require("../physics/RigidBody.js");
Bodies.rectangle = require("../bodies/Rectangle.js");

Bodies.createBodyFactory = function(Engine) {
	let factory = {};
	for (let type in Bodies) {
		if (isClass(Bodies[type])) {
			factory[type] = function(...args) {
				// Make sure options is defined
				if (typeof args[args.length - 1] != "object" || args[args.length - 1] instanceof vec) {
					args.push({});
				}
				return new Bodies[type](...args, Engine);
			}
		}
	}
	return factory;
}
