module.exports = {
	// ~ Point transformations
	screenPtToGame: function(point, Render) {
		const { camera, pixelRatio } = Render;
		const { scale, translation } = camera;
		return new vec((point.x * pixelRatio - translation.x) / scale, (point.y * pixelRatio - translation.y) / scale);
	},
	gamePtToScreen: function(point, Render) {
		const { camera, pixelRatio } = Render;
		const { scale, translation } = camera;
		return new vec((point.x * scale + translation.x) / pixelRatio, (point.y * scale + translation.y) / pixelRatio);
	},
	roundedPolygon: function(vertices, round, graphic) {
		if (vertices.length < 3) {
			console.warn("Render.roundedPolygon needs at least 3 vertices", vertices);
			return;
		}
		function getPoints(i) {
			let curPt = vertices[i];
			let lastPt = vertices[(vertices.length + i - 1) % vertices.length];
			let nextPt = vertices[(i + 1) % vertices.length];

			let lastDiff = lastPt.sub(curPt);
			let nextDiff = curPt.sub(nextPt);
			let lastLen = lastDiff.length;
			let nextLen = nextDiff.length;

			let curRound = Math.min(lastLen / 2, nextLen / 2, round);
			let cp = curPt;
			let pt1 = cp.add(lastDiff.normalize().mult(curRound));
			let pt2 = cp.sub(nextDiff.normalize().mult(curRound));

			return [pt1, cp, pt2];
		}

		let start = getPoints(0);
		graphic.moveTo(start[0].x, start[0].y);
		graphic.quadraticCurveTo(start[1].x, start[1].y, start[2].x, start[2].y);

		for (let i = 1; i < vertices.length; i++) {
			let cur = getPoints(i);
			graphic.lineTo(cur[0].x, cur[0].y);
			graphic.quadraticCurveTo(cur[1].x, cur[1].y, cur[2].x, cur[2].y);
		}

		graphic.lineTo(start[0].x, start[0].y);
	},
	roundedPolygonCtx: function(vertices, round, ctx) {
		if (vertices.length < 3) {
			console.warn("Render.roundedPolygon needs at least 3 vertices", vertices);
			return;
		}
		function getPoints(i) {
			let curPt = vertices[i];
			let lastPt = vertices[(vertices.length + i - 1) % vertices.length];
			let nextPt = vertices[(i + 1) % vertices.length];

			let lastDiff = lastPt.sub(curPt);
			let nextDiff = curPt.sub(nextPt);
			let lastLen = lastDiff.length;
			let nextLen = nextDiff.length;

			let curRound = Math.min(lastLen / 2, nextLen / 2, round);
			let cp = curPt;
			let pt1 = cp.add(lastDiff.normalize().mult(curRound));
			let pt2 = cp.sub(nextDiff.normalize().mult(curRound));

			return [pt1, cp, pt2];
		}

		let start = getPoints(0)
		ctx.moveTo(start[0].x, start[0].y);
		ctx.quadraticCurveTo(start[1].x, start[1].y, start[2].x, start[2].y);

		for (let i = 1; i < vertices.length; i++) {
			let cur = getPoints(i);
			ctx.lineTo(cur[0].x, cur[0].y);
			ctx.quadraticCurveTo(cur[1].x, cur[1].y, cur[2].x, cur[2].y);
		}

		ctx.closePath();
	},
	roundedRect: function(width, height, position, round, ctx) {
		Render.roundedPolygonCtx([
			new vec(-width/2, -height/2).add2(position),
			new vec( width/2, -height/2).add2(position),
			new vec( width/2,  height/2).add2(position),
			new vec(-width/2,  height/2).add2(position),
		], round, ctx);
	},
	arrow: function(position, direction, size = 10, ctx) {
		let endPos = new vec(position.x + direction.x, position.y + direction.y);
		let sideA = direction.rotate(Math.PI * 3/4).normalize2().mult(size);
		let sideB = sideA.reflect(direction.normalize());

		ctx.moveTo(position.x, position.y);
		ctx.lineTo(endPos.x, endPos.y);
		ctx.lineTo(endPos.x + sideA.x, endPos.y + sideA.y);
		ctx.moveTo(endPos.x, endPos.y);
		ctx.lineTo(endPos.x + sideB.x, endPos.y + sideB.y);
	},
}
