const vec = require("../geometry/vec.js");
const Animation = require("../other/Animation");
const { angleDiff } = require("../core/Common.js");

/**
 * Handles the game's camera. Accessed through `game.Render.camera`
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
	Render = null;

	/**
	 * Creates a new camera object used by [Render](./Render.html)
	 * @param {Render} Render - Render object the camera for
	 */
	constructor(Render) {
		this.Render = Render;
	}

	/**
	 * Sets the camera position
	 * @param {vec} position - New position
	 */
	setPosition(position) {
		this.position.set(position);
	}

	/**
	 * Sets the camera's field of view
	 * @param {number} fov - New field of view
	 */
	setFov(fov) {
		this.fov = fov;
	}

	// ~ Point transformations
	screenPtToGame(point) {
		let { scale, translation } = this;
		let parentBounds = this.Render._parentBoundingBox;
		let parent = new vec(parentBounds.left - window.scrollX, parentBounds.top - window.scrollY);
		return new vec((point.x - translation.x - parent.x) / scale, (point.y - translation.y - parent.y) / scale);
	}
	gamePtToScreen(point) {
		let { scale, translation } =  this;
		let parentBounds = this.Render._parentBoundingBox;
		let parent = new vec(parentBounds.left - window.scrollX, parentBounds.top - window.scrollY);
		return new vec((point.x * scale + translation.x + parent.x), (point.y * scale + translation.y + parent.y));
	}

	/**
	 * 
	 * @param {number} [intensity=30] - How much the camera shakes
	 * @param {number} [duration=1] - How long the camera shakes, in seconds
	 * @param {function} [intensityCurve=Animation.ease.out.cubic] - Animation curve, see [Animation](./Animation.html) for ease functions
	 * @param {vec} [direction] - Direction the camera shakes. Shakes in all directions if left undefined
	 */
	async shake(intensity = 30, duration = 1, intensityCurve = Animation.ease.out.cubic, direction = undefined) {
		if (direction) {
			direction?.normalize2();
			direction.y *= -1;
		}

		let shakeDuration = 0.01; // duration of individual shakes
		let curIntensity = intensity;

		let intensityAnimation = new Animation({
			duration: duration,
			curve: intensityCurve,
			ontick: p => {
				curIntensity = intensity * (1 - p);
				shakeDuration = 0.01 + 0.05 * p;
			}
		});
		intensityAnimation.run();

		function getAngle(prevAngle) {
			if (direction) {
				return direction.mult(-Math.sign(direction.dot(new vec(prevAngle)))).angle;
			}
			else {
				return (angleDiff(prevAngle, Math.random() * Math.PI + Math.PI) + Math.PI * 2) % Math.PI * 2;
			}
		}
		
		let delta = new vec(0, 0);
		let lastAngle = getAngle(Math.random() * Math.PI * 2);
		while (intensityAnimation.isRunning() && duration - intensityAnimation.getTime() > shakeDuration) {
			let curDuration = shakeDuration;
			let angle = getAngle(lastAngle);
			lastAngle = angle;
			let nextDelta = new vec(Math.cos(angle) * curIntensity, Math.sin(angle) * curIntensity);
			let lastDelta = new vec(delta);
			let deltaDelta = nextDelta.sub(lastDelta); // trust me this isn't acceleration
			await new Animation({
				duration: curDuration,
				curve: Animation.ease.linear,
				ontick: p => {
					this.position.sub2(delta);
					delta.set(deltaDelta.mult(p).add(lastDelta));
					this.position.add2(delta);
				},
			}).run();
		}
		let lastDelta = new vec(delta);
		let deltaDelta = delta.mult(-1);
		await new Animation({
			duration: shakeDuration,
			curve: Animation.ease.linear,
			ontick: p => {
				this.position.sub2(delta);
				delta.set(deltaDelta.mult(p).add(lastDelta));
				this.position.add2(delta);
			},
		}).run();
	}
};
module.exports = Camera;
