Events are exactly what they sound like: something that happens in the engine that can be seen by your code. You can bind multiple callback functions to events that are triggered every time that event occurs. Some events also pass arguments to callbacks that contain information about the event. All this is very vague, so let's jump into a specific scenario.
<br><br>
Say you have a function that you want to run every frame, like a character controller. You could create your own game loop to handle this, but this would be a waste of resources as ter.js already has a game loop running. You can bind your function to the ticker so it's called every time the engine's game loop runs with events:
```JavaScript
function updatePlayer() {
	// ...
}
game.Ticker.on("beforeTick", updatePlayer);
```
Alternatively, you can bind the event to the player body's updates, which accomplishes the same thing in this instance:
```JavaScript
playerBody.on("beforeUpdate", updatePlayer);
```
Note that the events are called at different times in the update loop. The `beforeTick` event is triggered before any physics is done and bodies are updated, while the `beforeUpdate` event is triggered right before the body's position is changed based on its velocity. In this case, the distinction doesn't matter, though.
<br>
In both of these examples, the event is called every frame, but many events don't operate this way. They can also be called only when certain things happen, such as a collision. With collision events, additional information is passed to the callbacks.
<br>
Collision events include `bodyEnter`, `bodyInside`, and `bodyExit`. `bodyEnter` is triggered when bodies first start colliding. Then, `bodyInside` is triggered every frame the bodies are still colliding. Finally, `bodyExit` is triggered on the frame the bodies stop colliding. These events can tell you what other body was involved in the collision, but nothing else.
```JavaScript
playerBody.on("bodyEnter", otherBody => {
	if (otherBody == spikeBody) {
		killPlayer();
	}
});
```
If you want additional information about the collision, you can use the second parameter, which contains all the information about the collision the engine has:
```JavaScript
// You probably want to use bodyEnter for this, but this is for illustration
playerBody.on("bodyInside", (otherBody, collision) => {
	if (otherBody == spikeBody && collision.normal.dot(new vec(0, -1)) > 0.5) {
		killPlayer();
	}
});
```
There are many different events, including many on bodies that aren't covered here. To see all the events of something, check its documentation.
