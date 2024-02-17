const vec = require("../geometry/vec.js");

module.exports = class Camera {
	position = new vec(0, 0);
	fov = 2000;
	translation = new vec(0, 0);
	scale = 1;
	boundSize = 1000;

	constructor(fov = 2000, boundSize = 1000) {
		this.fov = fov;
		this.boundSize = boundSize;
	}
};