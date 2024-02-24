const vec = require("../geometry/vec.js");
const Animation = require("../other/Animation");
const { angleDiff } = require("../core/Common.js");

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

	/**
	 * 
	 * @param {number} [intensity] - How much the camera shakes
	 * @param {number} [duration] - How long the camera shakes, in seconds
	 * @param {function} [intensityCurve] - Animation curve, see (Animation)[./Animation.html] for ease options
	 */
	async shake(intensity = 30, duration = 3, intensityCurve = Animation.ease.out.cubic) {
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
		console.log(duration, intensityAnimation.getTime(), shakeDuration);
		
		let delta = new vec(0, 0);
		let lastAngle = Math.random() * Math.PI * 2;
		while (intensityAnimation.isRunning() && duration - intensityAnimation.getTime() > shakeDuration) {
			let curDuration = shakeDuration;
			let angle = (angleDiff(lastAngle, Math.random() * Math.PI + Math.PI) + Math.PI * 2) % Math.PI * 2;
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
