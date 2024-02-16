"use strict";

class RenderGeometry {
	static all = new Set();
	constructor(body) {
		this.body = body;
		this.container = body.render.container ?? ter.Render.app.stage;
		this.create();
	}
	create() {
		let graphic = this.graphic = new PIXI.Graphics();
		let { body } = this;
		let { render, position, type, vertices } = body;
		let { background, border, borderWidth, borderOffset, lineJoin, lineDash, lineCap, round, layer } = render;
		let { parseColor } = ter.Common;
		background = parseColor(background);
		border = parseColor(border);


		if (background[1] > 0) graphic.beginFill(...background);
		if (border[1] > 0) {
			graphic.lineStyle({
				width: borderWidth,
				color: border[0],
				alpha: border[1],
				cap: lineCap,
				join: lineJoin,
				alignment: borderOffset,
			});
		}

		if (type === "rectangle") {
			let { width, height } = body;
			
			if (round > 0) {
				graphic.drawRoundedRect(-width/2, -height/2, width, height, round);
			}
			else {
				graphic.drawRect(-width/2, -height/2, width, height);
			}
		}
		else if (type === "circle") {
			let { radius } = body;
			graphic.drawCircle(0, 0, radius);
		}
		else { // manually draw vertices
			graphic.drawPolygon(vertices);
		}
		if (border[1] > 0) graphic.closePath();
		if (background[1] > 0) graphic.endFill();
		graphic.pivot.x = position.x;
		graphic.pivot.x = position.x;
		graphic.zIndex = layer;
	}
	setLayer(layer) {
		this.graphic.zIndex = layer;
	}
	destroy() {
		this.graphic.destroy();
	}
	update = function() {
		let { body, graphic } = this;
		let { position, render, angle } = body;
		let { visible, alpha } = render;
		
		if (!graphic) return;
		graphic.position.x = position.x;
		graphic.position.y = position.y;

		graphic.alpha = alpha;
		graphic.rotation = angle;
		graphic.visible = visible;
	}
	add() {
		RenderGeometry.all.add(this);
		this.graphic.visible = this.body.render.visible;
		this.container.addChild(this.graphic);
	}
	delete() {
		RenderGeometry.all.delete(this);
		this.graphic.visible = false;
		this.container.removeChild(this.graphic);
	}
}
