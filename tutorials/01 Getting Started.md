Download the latest ter.js bundle from the [releases tab](https://github.com/GreysonR/ter.js/releases/latest) on GitHub. Then include it with PIXI.js in your HTML:
```HTML
<script src="./path/to/ter.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/pixi.js@7.x/dist/pixi.min.js"></script>
```

Next, create a `Game` object, which will handle much of the setup for you:
```JavaScript
// There are numerous options (these are just a few, check the docs for all of them!)
let game = new ter.Game({
	Render: {
		parentElement: window, // Can be any element or window
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
let body = Bodies.Rectangle(100, 90, new vec(0, -200), { // Creates the physics body
	// All options: greysonr.github.io/ter.js/RigidBody.html#constructor
	friction: 0.05,
	restitution: 0.1,
}).addPolygonRender({ // Creates the renderer so we can see the body
	// All options: greysonr.github.io/ter.js/RigidBody.html#addPolygonRender
	background: "#C8553D",
}).add(); // Adds the body to the world

// Create a static body with a width of 1000, height of 80, and position of (0, 500)
let floor = Bodies.Rectangle(1000, 80, new vec(0, 500), {
	isStatic: true,
}).addPolygonRender({
	background: "#ffffff",
}).add();
```
And voilà, you're ready to start using ter.js!

## Architecture
ter.js is divided into several different modules that work together. These are:
- Engine: Calculates physics interactions of bodies and constraints
- World: Contains the bodies and manages the gravity, timescale, and other world constants
- Render: Manages how the world is rendered using PIXI.js
- Ticker: Main game loop that runs the engine every frame
- Game: Wrapper for other modules to set up the engine quickly

It also has the concept of [Nodes](./Node.html), which are objects that can have child nodes. This allows for grouping of bodies and other nodes. All rigid bodies are nodes, and even the world is a node since it contains bodies. Nodes also have a position and angle, and changing either propogates to child nodes. This means that you can group bodies together with a node and move them all at the same time by moving the parent node. The engine uses this to create render nodes that are children of bodies, so any translation or angle changes on the body also affect the render node. When you call `body.addPolygonRender` or `body.addSprite`, the engine creates the render node based on the options provided and adds it as a child to the body.
