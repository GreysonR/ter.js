"use strict";

ter.Render.camera.limits = {
	min: new vec(-Infinity, -Infinity),
	max: new vec(Infinity, Infinity),
};

ter.Render.on("beforeSave", () => { // change camera position so it's within limits
	const camera = ter.Render.camera;
	const { position:cameraPosition, fov:FoV } = camera;
	const boundSize = camera.boundSize;
	const canvWidth = canvas.width;
	const canvHeight = canvas.height;

	// update translation and scale so it's up to date for current frame
	camera.translation = { x: -cameraPosition.x * boundSize/FoV + canvWidth/2, y: -cameraPosition.y * boundSize/FoV + canvHeight/2 };
	camera.scale = boundSize / FoV;

	// { x: (point.x - camera.translation.x) / camera.scale, y: (point.y - camera.translation.y) / camera.scale }
	camera.bounds.min.set({ x: -camera.translation.x / camera.scale, y: -camera.translation.y / camera.scale });
	camera.bounds.max.set({ x: (canvWidth - camera.translation.x) / camera.scale, y: (canvHeight - camera.translation.y) / camera.scale });
	
	let offset = new vec(0, 0);
	offset.sub2(camera.bounds.min.sub(camera.limits.min).min2(new vec(0, 0)));
	offset.sub2(camera.bounds.max.sub(camera.limits.max).max2(new vec(0, 0)));
	camera.position.add2(offset);

	if (camera.bounds.max.x - camera.bounds.min.x >= camera.limits.max.x - camera.limits.min.x) {
		camera.position.x = (camera.limits.max.x + camera.limits.min.x) / 2;
	}
	if (camera.bounds.max.y - camera.bounds.min.y >= camera.limits.max.y - camera.limits.min.y) {
		camera.position.y = (camera.limits.max.y + camera.limits.min.y) / 2;
	}
});
