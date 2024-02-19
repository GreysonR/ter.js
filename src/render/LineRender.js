"use strict";

/**
 * Renders lines. Mainly used for rendering constraints
 * @class RenderLine
 */
class RenderLine {
	static all = new Set();
	constructor(body) {
		this.body = body;
		this.container = body.render.container ?? ter.Render.app.stage;
		this.create();
	}
	create() {
		let graphic = this.graphic = new PIXI.Graphics();
		graphic.zIndex = this.body.render.layer ?? 0;
		this.draw();
	}
	draw() {
		let { body, graphic } = this;
		let { render } = body;
		let { pointA, pointB } = body.getPoints();
		graphic.clear();

		let { border, borderWidth, borderOffset, lineJoin, lineCap } = render;
		let { parseColor } = ter.Common;
		border = parseColor(border);

		if (border[1] > 0) {
			graphic.lineStyle({
				width: borderWidth,
				color: border[0],
				alpha: border[1],
				cap: lineCap,
				join: lineJoin,
				alignment: borderOffset,
			});
			graphic.moveTo(pointA.x, pointA.y);
			graphic.lineTo(pointB.x, pointB.y);
		}
	}
	setLayer(layer) {
		this.graphic.zIndex = layer;
	}
	destroy() {
		this.graphic.destroy();
	}
	update = function() {
		let { graphic, body } = this;
		let { alpha, visible } = body.render;
		if (!graphic) return;
		
		this.draw();
		graphic.alpha = alpha;
		graphic.visible = visible;
	}
	add() {
		RenderLine.all.add(this);
		this.graphic.visible = this.body.render.visible;
		this.container.addChild(this.graphic);
	}
	delete() {
		RenderLine.all.delete(this);
		this.graphic.visible = false;
		this.container.removeChild(this.graphic);
	}
}
