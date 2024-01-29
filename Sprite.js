"use strict";

class Sprite {
	static all = new Set();
	static imgDir = "./img/";
	constructor(body) {
		this.body = body;
		let { render } = body;
		let { sprite } = render;
		let { src, width, height, position, scale } = sprite;
		this.src = src;
		this.scale = scale;
		this.width =  width;
		this.height = height;
		this.position = position ?? new vec(0, 0);
		this.container = body.render.container ?? ter.Render.app.stage;

		this.loaded = false;
		this.loadTexture();
	}
	loadTexture() {
		PIXI.Assets.load(Sprite.imgDir + this.src).then(this.createSprite.bind(this));
	}
	createSprite() {
		// todo: make this async
		let { width, height, position, src, body } = this;
		let layer = body.render.layer;
		let sprite = this.sprite = PIXI.Sprite.from(Sprite.imgDir + src);
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
	}
	update = function() {
		if (!this.loaded) return;
		let { position: spritePos, sprite, body, scale, width, height } = this;
		let { position, angle, render, spriteScale } = body;
		let { alpha } = render;
		
		let curPosition = position.add(spritePos);
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
		if (!this.sprite) {
			this.on("load", this.add.bind(this));
			return;
		}
		Sprite.all.add(this);
		this.sprite.visible = true;
		this.container.addChild(this.sprite);
	}
	delete() {
		Sprite.all.delete(this);
		this.sprite.visible = false;
		this.container.removeChild(this.sprite);
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
