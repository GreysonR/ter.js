"use strict";

class Sprite {
	static all = new Set();
	static imgDir = "./img/";
	constructor(body) {
		this.body = body;
		let { render } = body;
		let { sprite } = render;
		let { src, width, height, position, scale } = sprite;
		this.src = Sprite.imgDir + src;
		this.scale = scale;
		this.width =  width;
		this.height = height;
		this.position = new vec(position ?? { x: 0, y: 0 });
		this.container = body.render.container ?? ter.Render.app.stage;

		this.add = this.add.bind(this);
		this.loaded = false;
		this.removed = false;
		this.loadTexture();
	}
	loadTexture() {
		PIXI.Assets.load(this.src).then(this.createSprite.bind(this));
	}
	createSprite() {
		// todo: make this async or load all sprites when game is loaded
		let { width, height, position, src, body } = this;
		let layer = body.render.layer;
		let sprite = this.sprite = PIXI.Sprite.from(src);
		sprite.anchor.set(0.5);
		sprite.x = position.x;
		sprite.y = position.y;
		sprite.zIndex = layer;

		if (!this.scale) {
			width = width ?? sprite.width;
			height = height ?? sprite.height;
			this.scale = new vec(width / sprite.width, height / sprite.height);
		}
		
		this.loaded = true;
		this.trigger("load");

		if (this.removed) {
			sprite.visible = false;
			this.container.removeChild(this.sprite);
		}
	}
	update = function() {
		if (!this.loaded) return;
		let { position: spritePos, sprite, body, scale, width, height } = this;
		let { position, angle, render, spriteScale } = body;
		let { alpha } = render;
		
		let curPosition = position.add(spritePos.rotate(angle));
		sprite.x = curPosition.x;
		sprite.y = curPosition.y;
		
		width = width ?? sprite.width;
		height = height ?? sprite.height;
		let curScale = scale.mult(spriteScale ?? 1);
		sprite.scale.x = curScale.x;
		sprite.scale.y = curScale.y;

		sprite.alpha = alpha;
		sprite.rotation = angle;
	}
	setLayer(layer) {
		this.sprite.zIndex = layer;
	}
	add() {
		if (!this.sprite && !this.removed) {
			this.on("load", this.add);
			return;
		}
		Sprite.all.add(this);
		this.sprite.visible = true;
		this.container.addChild(this.sprite);
		this.removed = false;
	}
	delete() {
		Sprite.all.delete(this);
		if (this.sprite) {
			this.sprite.visible = false;
			// this.sprite.destroy(); // maybe make this smarter in the future
		}
		this.container.removeChild(this.sprite);
		this.removed = true;
		
		this.off("load", this.add);
	}
	destroy() {
		this.sprite.destroy();
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
