const Animation = require("../other/Animation");

class DiscreteAnimation {
	static all = new Set();
	static update() {
		const now = performance.now();
		for (let animation of DiscreteAnimation.all) {
			let { startTime, duration, frames, lastFrame, curve, totalLoops, loopNumber } = animation;
			let pLinear = Math.max(0, Math.min(1, (now - startTime) / duration));
			let p = curve(pLinear);
			
			if (pLinear >= 1) {
				if (loopNumber + 1 < totalLoops) {
					animation.loopNumber++;
					animation.startTime = now;
					p = curve(0);
				}
				else {
					animation.lastFrame = frames - 1;
					if (animation.stop) animation.stop();
				}
			}

			let frame = Math.floor(p * frames);
			animation.frame = frame;
			if (p < 1 && frame !== lastFrame) {
				animation.lastFrame = frame;
				if (animation.callback) animation.callback(frame);
			}
		}
	}

	constructor({ frames, duration = 200, curve = Animation.ease.linear, callback, onstart, onend, totalLoops = 1, autostart = false }) {
		this.frame = 0;
		this.frames = frames;
		this.duration = duration;
		this.startTime = performance.now();
		this.curve = curve;
		this.pauseTime = 0;
		this.lastFrame = -1;
		this.loopNumber = 0;
		this.totalLoops = totalLoops ?? 1;

		this.callback = callback;
		this.onstart = onstart;
		this.onend = onend;
		this.playing = false;

		if (autostart && totalLoops > 0) {
			DiscreteAnimation.all.add(this);
			if (typeof this.onstart === "function") this.onstart();
		}
	}
	stop() {
		if (this.playing) {
			if (typeof this.onend === "function") this.onend();
			DiscreteAnimation.all.delete(this);
			this.pauseTime = 0;
			this.lastFrame = -1;
			this.loopNumber = 0;
			this.playing = false;
		}
	}
	pause() {
		if (this.playing) {
			DiscreteAnimation.all.delete(this);
			this.pauseTime = performance.now() - this.startTime;
			this.playing = false;
		}
	}
	start() {
		this.startTime = performance.now() - this.pauseTime;
		DiscreteAnimation.all.add(this);
		this.playing = true;

		if (this.pauseTime === 0 && typeof this.onstart === "function") {
			this.onstart();
		}
	}
}

module.exports = DiscreteAnimation;
