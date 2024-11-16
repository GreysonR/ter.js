You often want to have additional information about the what the underlying engine is doing or a graph that shows the performance of your game. ter.js has a few built in features to do these things. <br>
To enable debug rendering in your game, call:
```JavaScript
game.createDebugRender();
```
This creates 2 new canvas elements. The first is for rendering debug information about the engine. It can show things about your game that you might not otherwise be able to see like wireframes, collisions, bounding boxes, broadphase grids, and the computed center of mass of the bodies. By default, all this is disabled, but you can access them directly through `game.DebugRender.enabled`
```JavaScript
game.DebugRender.enabled.wireframes = true;
game.DebugRender.enabled.collisions = true;
game.DebugRender.enabled.centers = true;
game.DebugRender.enabled.broadphase = true;
game.DebugRender.enabled.boundingBox = true;
```
The second canvas created can render the engine's measured performance. It is also disabled by default and can be enabled using:
```JavaScript
game.Engine.Performance.render.enabled = true;
```