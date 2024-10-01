## Position and Velocity
Once you have bodies in your world, you can start manipulating them in various ways. The most direct way to change a body's position and angle is by directly setting them with `setPosition` and `setAngle`:
```JavaScript
// Create a body at (0, 0) with an angle of 0
let body = Bodies.Rectangle(100, 100, new vec(0, 0)).addPolygonRender({
	background: "#F28F3B",
}).add();

// Change its position to (-150, 20)
body.setPosition(new vec(-150, 20));

// Change its angle to PI/4 radians (45deg)
body.setAngle(Math.PI/4);
```
This is good for instantly setting the body's position. However, it doesn't work very well with physics as there is no velocity imparted by the position change. To directly set the velocity, you can use `setVelocity` and `setAngularVelocity`:
```JavaScript
body.setVelocity(new vec(0, -200)); // body will travel 200px/s up
body.setAngularVelocity(Math.PI / 4); // body will rotate 45deg/s clockwise
```
This works much nicer with the physics system, but you still may not want to directly manipulate the velocity, but instead change it by a relative amount. In this case, use `applyForce` and `applyTorque`:
```JavaScript
body.applyForce(new vec(100, 0), 1); // Changes velocity by 100px/s
body.applyTorque(3, 1); // Changes angular velocity by 3 radians/s
```
You may have noticed a second parameter in those functions. It represents the amount of time the force is applied for. If you want the velocity to instantly change by the amount you give it, use 1s as the time, like what's done in the previous example. However, if you are applying force every frame, you should use the amount of time between each frame. If you use a constant value instead, the amount of acceleration will depend on the framerate. Fortunately, the default for the parameter does this for you:
```JavaScript
body.on("beforeUpdate", () => { // this function is called every frame
	body.applyForce(new vec(50, 0)); // changes the velocity by 50px/s/s
	body.applyTorque(3); // changes the angular velocity by 3 radians/s/s
});
```

## Other Properties
Most properties can be directly changed:
```JavaScript
body.restitution = 0.3;

body.frictionAir = 0.1;
body.frictionAngular = 1;
body.friction = 0.3;

body.isSensor = false;
body.collisionFilter.layer = 0b0001;
```
However, some require a method to set them:
```JavaScript
body.setStatic(true);
body.setCollisions(false);
body.setMass(20);
```
