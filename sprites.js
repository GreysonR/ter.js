"use strict";

class Sprite {
	static all = {};
	static allBuffers = {};
	static imgDir = "./img/";
	constructor({ src = "", width, height, position, scale = new vec(1, 1) }) {
		this.src = src;
		this.width = width;
		this.height = height;
		this.scale = scale;
		this.loaded = false;
		this.position = position;
		this.useBuffer = false;

		this.clip = {
			enabled: false,
			position: new vec(0, 0),
			size: new vec(0, 0),
		};

		let sprite = this;
		let cache = Sprite.all[src];
		
		if (!cache) {
			let img = new Image();
			img.width =  width;
			img.height = height;
			
			// cache image
			Sprite.all[src] = img;

			img.onload = function() {
				sprite.image = img;
				sprite.loaded = true;
				sprite.naturalWidth = img.naturalWidth;
				sprite.naturalHeight = img.naturalHeight;
				sprite.naturalScale = sprite.naturalWidth / sprite.width;
				sprite.trigger("load");
				sprite.events.load.length = 0;
			}
			img.src = Sprite.imgDir + src;
		}
		else {
			sprite.image = cache;
			sprite.loaded = true;
			sprite.naturalWidth = cache.naturalWidth;
			sprite.naturalHeight = cache.naturalHeight;
			sprite.naturalScale = sprite.naturalWidth / sprite.width;
			sprite.trigger("load");
			sprite.events.load.length = 0;
		}
	}
	buffer() {
		let { src, width, height, image } = this;
		let cache = Sprite.allBuffers[src];
		if (!cache) {
			let buffer = document.createElement("canvas");
			// let scale = 0.5 * Math.min(1.5, Math.sqrt(canv.width * canv.height / 1700 ** 2));
			// let scale = Math.min(1, camera.scale * 0.9);
			let scale = Math.min(1, camera.scale * 0.5);
			buffer.width  = width  * scale;
			buffer.height = height * scale;

			// console.log(buffer, this);
			buffer.getContext("2d").drawImage(image, 0, 0, buffer.width, buffer.height);
			this.image = buffer;
			Sprite.allBuffers[src] = buffer;

			buffer.id = src + "-buffer";
			buffer.style.position = "absolute";
			buffer.style.top = "0px";
			buffer.style.left = "0px";
			buffer.style.opacity = 0.0001;
			buffer.style.pointerEvents = "none";
			document.body.appendChild(buffer);
		}
		else {
			this.image = cache;
		}
		this.useBuffer = true;
	}
	render = function(position, angle, ctx = ter.ctx, spriteScale = new vec(1, 1)) {
		if (!this.loaded) return;
		let { position: spritePos, width, height, scale, image } = this;
		scale = scale.mult(spriteScale);

		ctx.translate(position.x, position.y);
		ctx.rotate(angle);
		ctx.scale(scale.x, scale.y);
		ctx.drawImage(image, spritePos.x, spritePos.y, width, height);
		ctx.scale(1 / scale.x, 1 / scale.y);
		ctx.rotate(-angle);
		ctx.translate(-position.x, -position.y);
	}
	renderClipped = function(position, angle, clipPosition = this.clip.position, clipSize = this.clip.size, ctx = ter.ctx, spriteScale = new vec(1, 1)) {
		if (!this.loaded) return;
		let { position: spritePos, scale, naturalScale, image } = this;
		scale = scale.mult(spriteScale);

		let xScale = this.naturalWidth / this.width;
		let yScale = this.naturalHeight / this.height;

		ctx.translate(position.x, position.y);
		ctx.rotate(angle);
		ctx.scale(scale.x, scale.y);
		ctx.drawImage(image, clipPosition.x * xScale, clipPosition.y * xScale, clipSize.x * xScale, clipSize.y * yScale, spritePos.x, spritePos.y, clipSize.x, clipSize.y);
		ctx.scale(1 / scale.x, 1 / scale.y);
		ctx.rotate(-angle);
		ctx.translate(-position.x, -position.y);
	}
	deleteCache() {
		delete Sprite.all[this.src];
		if (this.useBuffer) {
			document.body.removeChild(Sprite.allBuffers[this.src]);
			delete Sprite.allBuffers[this.src];
		}
	}

	events = {
		load: [],
	}
	on(event, callback) {
		if (event === "load" && this.loaded) {
			callback();
			return;
		}

		if (this.events[event]) {
			this.events[event].push(callback);
		}
	}
	off(event, callback) {
		event = this.events[event];
		if (event.includes(callback)) {
			event.splice(event.indexOf(callback), 1);
		}
	}
	trigger(event) {
		this.events[event].forEach(callback => {
			callback();
		});
	}
}

class DiscreteAnimation {
	static all = new Set();
	static update() {
		const now = ter.World.time;
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

	constructor({ frames, duration = 200, curve = ease.linear, callback, onstart, onend, totalLoops = 1, autostart = false }) {
		this.frame = 0;
		this.frames = frames;
		this.duration = duration;
		this.startTime = ter.World.time;
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
			this.pauseTime = ter.World.time - this.startTime;
			this.playing = false;
		}
	}
	start() {
		this.startTime = ter.World.time - this.pauseTime;
		DiscreteAnimation.all.add(this);
		this.playing = true;

		if (this.pauseTime === 0 && typeof this.onstart === "function") {
			this.onstart();
		}
	}
}

class SpriteAnimation extends DiscreteAnimation {
	constructor({ sprite, frameSize = new vec(100, 100), animationNumber = 0, frameNumber = 0, duration = 200, curve = ease.linear, onstart, onend, totalLoops = 1, autostart = false, spriteScale = new vec(1, 1) }) {
		super({
			frames: Math.round(sprite.width / frameSize.x),
			duration: duration,
			curve: curve,
			onstart: onstart,
			onend: onend,
			totalLoops: totalLoops,
			autostart: autostart,
		});
		this.sprite = sprite;
		this.curve = curve;
		this.callback = this.update.bind(this);

		this.frame = frameNumber;
		this.lastFrame = frameNumber - 1;
		this.animationNumber = animationNumber;
		this.spriteScale = spriteScale;
		
		sprite.clip.enabled = true;
		sprite.clip.position = new vec(0, 0);
		sprite.clip.size = new vec(frameSize);

		if (autostart && totalLoops > 0) {
			SpriteAnimation.all.add(this);
			if (typeof this.onstart === "function") this.onstart();
		}
	}
	update(frame) {
		this.sprite.clip.position.x = frame * this.sprite.clip.size.x;
		this.sprite.clip.position.y = this.animationNumber * this.sprite.clip.size.y;
	}
	setAnimationNumber(animationNumber) {
		this.animationNumber = animationNumber;
		this.update(this.frame);
	}
	start() {
		super.start();
		this.sprite.scale.set(this.spriteScale);
	}
}
