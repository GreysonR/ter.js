The engine uses a coordinate system based on pixels. However, one pixel in game does not correspond to one pixel in the HTML. To access move and scale the camera, access the camera object under `game.Render.camera`
```JavaScript
let { camera } = game.Render;
camera.position = new vec(100, 200); // sets the camera's position to (100, 200)
camera.fov = 1200; // sets the camera's fov to 1200. This means that the 
```