"use strict";

class RenderGeometry {
	static all = new Set();
	constructor(body) {
		this.body = body;
		this.create();
	}
	create() {
		let graphic = this.graphic = new PIXI.Graphics();
		let { body } = this;
		let { render, position, type, vertices } = body;
		let { background, border, borderWidth, lineJoin, lineDash, lineCap } = render;
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
			});
		}

		if (type === "rectangle") {
			let { width, height } = body;
			graphic.drawRect(-width/2, -height/2, width, height);
		}
		else if (type === "circle") {
			let { radius } = body;
			graphic.drawCircle(0, 0, radius);
		}
		else { // manually draw vertices
			graphic.moveTo(vertices[0].x, vertices[0].y);
			for (let i = 1; i < vertices.length; ++i) {
				let vertice = vertices[i];
				graphic.lineTo(vertice.x, vertice.y);
			}
		}
		if (border[1] > 0) graphic.closePath();
		if (background[1] > 0) graphic.endFill();
		graphic.pivot.x = position.x;
		graphic.pivot.x = position.x;
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
		graphic.visible = visible
	}
	add() {
		RenderGeometry.all.add(this);
		this.graphic.visible = true;
		ter.Render.app.stage.addChild(this.graphic);
	}
	delete() {
		RenderGeometry.all.delete(this);
		this.graphic.visible = false;
		ter.Render.app.stage.removeChild(this.graphic);
	}
}
