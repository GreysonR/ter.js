let ter = module.exports;

ter.Performance = require("./core/Performance.js");
ter.Game = require("./core/Game.js");
ter.Functions = require("./core/GameFunctions.js");
ter.Common = require("./core/Common.js");


ter.Node = require("./node/Node.js");
ter.World = require("./node/World.js");

ter.Engine = require("./physics/Engine.js");
ter.RigidBody = require("./physics/RigidBody.js");

ter.vec = require("./geometry/vec.js");
ter.Grid = require("./geometry/Grid.js");
ter.Bezier = require("./geometry/Bezier.js");

ter.simplexNoise = require("./lib/simplexNoise.js");
ter.polyDecomp = require("./lib/poly-decomp.js");
