The engine uses a coordinate system based on pixels. However, one pixel in game does not correspond to one pixel in the HTML. To access move and scale the camera, access the camera object under `game.Render.camera`
```JavaScript
let { camera } = game.Render;
camera.position = new vec(100, 200); // sets the camera's position to (100, 200)
camera.fov = 1200; // sets the camera's fov to 1200 
```
Translating from screen space to world space can be done easily using methods in the camera object:
```JavaScript
let worldPosition = camera.screenPtToGame(new vec(100, 100)); // translates (100, 100) to where it would be in the engine's world
let screenPosition = camera.gamePtToScreen(new vec(0, 0)); // translate (0, 0) to where it would be in the HTML body
```

By default, the camera scales based on the canvas's width and height to maintain total area. You can change how it scales by specifying `Render.getBoundSize` when creating the game.
This function exists to provide a way to have consistent scaling of a game's content across different screen sizes. Everything rendered is scaled by `boundSize / fov`, so if boundSize is related to the screen size, then the rendered content will scale to fit the screen.
```JavaScript
new ter.Game({
	Render: {
		getBoundSize: function(width, height) { // this function is called when the game is created and when the window is resized
			return Math.min(width, height); // this will scale to keep the smallest dimension in view
		}
	}
});
```
If you don't want the rendering to scale, you can return a constant:
```JavaScript
let game = new ter.Game({
	Render: {
		getBoundSize: function(width, height) {
			return 1;
		}
	}
});
game.Render.camera.fov = 1; // the world will be rendered 1:1 with the window, so 100px in the world will be 100px in the HTML
```
