The best way to create bodies is using methods is through your game object. If you're following the tutorials in order, you've already seen this in the previous section. The benefit of this over creating a body directly with the class is that you don't have to specify what game it belongs to. 
```JavaScript
let { Bodies } = game;
let rect = Bodies.Rectangle(50, 50, new vec(0, 0));
```
Now you have a rectangle, but nothing rendering it. To see the beautiful new rectangle you've created, call `body.addPolygonRender`. It takes an object of options:
```JavaScript
// This includes all addPolygonRender options
body.addPolygonRender({
	layer: 0, // Render layer, higher means it is rendered "closer" to the camera and above other objects
	visible: true,
	alpha: 1, // Opacity, between 0-1
	
	// Colors can be a hex code, rgb, rgba, or "transparent"
	// ie "#808080", "rgb(128, 128, 128)", "rgba(128, 128, 128, 0.5)", and "transparent" all work
	background: "#ffffff80", // fill color, in this case white with 50% opacity

	border: "#ff0000", // border color
	borderWidth: 3, // How thick border is, set to 0 to disable border
	lineCap: "butt", // How border should end. Doesn't do anything for closed bodies
	lineJoin: "miter", // How border's corners should look. Same options as ctx.lineJoin property
	
	round: 0, // How rounded the polygon should look. Only works for Rectangles
});
```

However, for our purposes, we only need to specify the background color. Here, the method is chained with body creation for conciseness:
```JavaScript
let rect = Bodies.Rectangle(50, 50, new vec(0, 0)).addPolygonRender({
	background: "#588B8B",
});
```

The body still won't appear because it isn't in the world yet. Calling `body.add()` fixes this:
```JavaScript
let rect = Bodies.Rectangle(50, 50, new vec(0, 0)).addPolygonRender({
	background: "#588B8B",
}).add();
```
If you later want to remove the body from the world, call `body.delete()`.

There are many different types of bodies that can be created. These include:
* Rectangle
* Circle
* RegularPolygon
* Polygon

```JavaScript
let options = {};
let position = new vec(10, -200); // x: 10, y: -200

// Rectangle
let width = 50;
let height = 70;
let rect = Bodies.Rectangle(width, height, position, options);

// Circle
let radius = 50;
let circle = Bodies.Circle(radius, position, options);

// Regular polygon
let rpRadius = 60;
let sideCount = 6;
let regularPolygon = Bodies.RegularPolygon(rpRadius, sideCount, position, options);

// Polygon: A body made from a list of vertices
let vertices = [new vec(0, 0), new vec(50, 100), new vec(-50, 100)];
let polygon = Bodies.Polygon(vertices, position, options);
```

In the previous example, you may have noticed an empty `options` object. This object contains many properties of the body:
```JavaScript
// A basic example using some options
let body = Bodies.Circle(100, new vec(0, 300), {
	mass: 10,
	restitution: 0,
	isStatic: true,
});

// All available options with their defaults
let bodyAllOptions = Bodies.Rectangle(100, 100, new vec(0, -400), {
	mass: 1,
	restitution: 0.1, // Bounciness
	
	angle: 0, // Initial angle the body has

	frictionAir: 0.05, // How much body is constantly slowed down
	frictionAngular: 0.01, // How much rotation is constantly slowed down
	friction: 0.1,

	round: 0, // How much vertices are rounded
	roundQuality: 20, // Quality of the rounding: Higher means lower vertice density, or lower quality

	isStatic: false, // If the body is moveable
	isSensor: false, // If the body should act like a sensor; Sensors detect collisions, but don't actually hit other bodies
	hasCollisions: true, // If the body can collide with anything
	collisionFilter: { // What bodies are allowed to collide with it
		layer: 0xFFFFFF,
		mask: 0xFFFFFF,
	},
});
```

So, to put it all together, we can create bodies with many different shapes, sizes, and visuals, then add them to the world:
```JavaScript
let body = Bodies.RegularPolygon(80, 5, new vec(0, -100), {
	restitution: 0.3,
	frictionAir: 0.1,
	frictionAngular: 0,
	friction: 0.4,
	round: 10,
}).addPolygonRender({
	background: "transparent",
	border: "#588B8B",
	borderWidth: 3,
	lineJoin: "round",
}).add();
```

