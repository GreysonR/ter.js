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

		let sprite = this;
		let cache = Sprite.all[src];
		
		if (!cache) {
			let img = new Image();
			
			// document.body.appendChild(img);
			// img.id = src + "-image";
			// img.style.position = "absolute";
			// img.style.top =  "0px";
			// img.style.left = "0px";
			// img.style.opacity = 0.001;
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
			let scale = Math.min(1, camera.scale);
			buffer.width =  width  * scale * this.naturalScale;
			buffer.height = height * scale * this.naturalScale;

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

			this.naturalWidth =  buffer.width;
			this.naturalHeight = buffer.height;
		}
		else {
			this.image = cache;
			this.naturalWidth =  cache.width;
			this.naturalHeight = cache.height;
		}
		this.useBuffer = true;
	}
	render = function(position, angle, ctx, spriteScale = new vec(1, 1)) {
		if (!this.naturalWidth) {
			this.naturalWidth = this.image.naturalWidth;
			this.naturalHeight = this.image.naturalHeight;
			if (!this.naturalWidth) {
				return;
			}
		}
		let { position: spritePos, width, height, scale, image, naturalWidth, naturalHeight } = this;
		let bounds = ter.Render.camera.bounds;
		scale = scale.mult(spriteScale);
		
		let rx = Math.max(position.x, bounds.min.x + width/2) - position.x;
		let ry = Math.max(position.y, bounds.min.y + height/2) - position.y;
		let rw = (Math.min(position.x + width, bounds.max.x + width/2) - position.x - rx);
		let rh = (Math.min(position.y + height, bounds.max.y + height/2) - position.y - ry);
		if (rw <= 0 || rh <= 0) return;

		let xScale = naturalWidth / width;
		let yScale = naturalHeight / height;
		let sx = rx * xScale;
		let sy = ry * xScale;
		let sw = rw * xScale;
		let sh = rh * yScale;

		ctx.translate(position.x, position.y);
		ctx.rotate(angle);
		ctx.scale(scale.x, scale.y);
		ctx.drawImage(image, sx, sy, sw, sh, rx + spritePos.x, ry + spritePos.y, rw, rh);
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

class SpriteAnimation {
	static all = new Set();
	static update() {
		const now = ter.World.time;
		for (let animation of SpriteAnimation.all) {
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
					animation.lastFrame = frames.length - 1;
					animation.stop();
				}
			}

			let frame = Math.floor(p * frames.length);
			if (p < 1 && frame !== lastFrame) {
				animation.lastFrame = frame;
				animation.callback({ sprite: frames[frame], frame: frame });
			}
		}
	}

	constructor({ frames = [], duration = 200, curve = ease.linear, callback, onstart, onend, totalLoops = 1, autostart = false }) {
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
			SpriteAnimation.all.add(this);
			if (typeof this.onstart === "function") this.onstart();
		}
	}
	stop() {
		if (this.playing) {
			if (typeof this.onend === "function") this.onend();
			SpriteAnimation.all.delete(this);
			this.pauseTime = 0;
			this.lastFrame = -1;
			this.loopNumber = 0;
			this.playing = false;
		}
	}
	pause() {
		if (this.playing) {
			SpriteAnimation.all.delete(this);
			this.pauseTime = ter.World.time - this.startTime;
			this.playing = false;
		}
	}
	start() {
		this.startTime = ter.World.time - this.pauseTime;
		SpriteAnimation.all.add(this);
		this.playing = true;

		if (this.pauseTime === 0 && typeof this.onstart === "function") {
			this.onstart();
		}
	}
}
