const vec = require("../geometry/vec.js");
const Animation = require("../other/Animation");

/**
 * Handles the game's camera
 */
class Camera {
	/**
	 * Position of the camera
	 * @readonly
	 * @type {vec}
	 */
	position = new vec(0, 0);
	/**
	 * Field of view
	 * @readonly
	 * @type {number}
	 */
	fov = 2000;
	translation = new vec(0, 0);
	scale = 1;
	boundSize = 1000;

	/**
	 * Creates a new camera object used by [Render](./Render.html)
	 * @param {number} fov - Field of view, how much you can see
	 */
	constructor(fov = 2000) {
		this.fov = fov;
	}

	/**
	 * Sets the camera position
	 * @param {vec} position - New position
	 */
	setPosition(position) {
		this.position.set(position);
	}

	/**
	 * Sets the camera's FOV
	 * @param {number} fov - New field of view
	 */
	setFov(fov) {
		this.fov = fov;
	}

	shake() {

	}
};
module.exports = Camera;
