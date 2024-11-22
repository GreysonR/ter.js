Events are exactly what they sound like: something that happens in the engine that can be seen by your code. You can bind multiple callback functions to events that are triggered every time that event occurs. Some events also pass arguments to callbacks that contain information about the event. All this is very vague, so let's jump into a specific scenario.
<br><br>
Say you have a function that you want to run every frame, like a character controller. You could create your own loop to handle this, but this would be a waste of resources as ter.js already has a game loop running. You can instead bind your function to the ticker so it's called every time the engine's game loop runs using events:
```JavaScript
function updatePlayer() {
	// ...move the player character
}
game.Ticker.on("beforeTick", updatePlayer); // now updatePlayer is called every frame
```
Alternatively, you can bind the event to the player body's updates, which does a similar thing. The main difference in this case is that this event is only triggered when the body is in the world, which may be desirable for a character controller:
```JavaScript
playerBody.on("beforeUpdate", updatePlayer);
```

In both of these examples, the event is called every frame, but many events don't operate this way. They may also be called only when certain things happen, such as a collision. With collision events, additional information is passed to the callback.<br>

Collision events include `bodyEnter`, `bodyInside`, and `bodyExit`. `bodyEnter` is triggered when bodies first start colliding. Then, `bodyInside` is triggered every subsequent frame the bodies are still colliding. Finally, `bodyExit` is triggered on the frame the bodies stop colliding. If a body has multiple collisions happening at the same time, each collision event is called separately. These events tell the callback everything about the collision, such as the other body involved.
```JavaScript
playerBody.on("bodyEnter", otherBody => {
	if (otherBody == spikeBody) {
		killPlayer();
	}
});
```
If you want additional information about the collision, you can use the second parameter, which contains all the information about the collision the engine has:
```JavaScript
playerBody.on("bodyInside", (otherBody, collision) => {
	if (otherBody == spikeBody && collision.normal.dot(new vec(0, -1)) > 0.5) {
		killPlayer();
	}
});
```
There are many different events, including many on bodies that aren't covered here. To see all the events for an object, check its documentation.
