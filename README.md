# ter.js
*A 2D physics engine built for web games*

## Features
- Rigid bodies
- Concave bodies
- Configurable mass, friction, restitution, collision filters
- Matches your monitor's refresh rate and pixel ratio out of the box
- Robust event system
- Fast WebGL rendering

## Getting started
Download the ter.js bundle of your choosing from the [releases tab](https://github.com/GreysonR/ter.js/releases/latest) on GitHub. Then include it with PIXI.js in your HTML:
```HTML
<script src="./path/to/ter.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/pixi.js@7.x/dist/pixi.min.js"></script>
```

Next, create a `Game` object, which will handle much of the setup for you:
```JavaScript
// There are numerous options (these are just a few, check the docs for all of them!)
let game = new ter.Game({
	Render: {
		parentElement: window, // Can also be any element
		background: "#1C1C25", // Can be a hex code, rgb, rgba, or "transparent"
	},
	World: {
		gravity: new ter.vec(0, 500) // Means that objects accelerate at 500px/s^2 down
	},
});
```
Or create a `Game` with all default options:
```JavaScript
// Can be simple as this!
let game = new ter.Game();
```
At this point, ter.js is running. However, you won't see anything yet because no bodies have been added. Let's fix that:
```JavaScript
let vec = ter.vec;
let Bodies = game.Bodies;

// Create a rectangle with a width of 100, height of 90, and initial position of (0, -200)
let body = Bodies.Rectangle(100, 90, new vec(0, -200), { // Create the physics body
	// All body options: greysonr.github.io/ter.js/RigidBody.html#constructor
	friction: 0.05,
	restitution: 0.1,
}).addPolygonRender({ // Create the renderer so we can see the body
	// All render options: greysonr.github.io/ter.js/RigidBody.html#addPolygonRender
	background: "#C8553D",
}).add(); // Add the body to the world

// Create a static body with a width of 1000, height of 80, and position of (0, 500)
let floor = Bodies.Rectangle(1000, 80, new vec(0, 500), {
	isStatic: true,
}).addPolygonRender({
	background: "#ffffff",
}).add();
```
And voilà, you're ready to start using ter.js!

## Next steps
To learn more on how to use the engine, you can head on over to the [tutorials](https://greysonr.github.io/ter.js/tutorial-01%20Getting%20Started.html)
