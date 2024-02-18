let ter = module.exports;

ter.Performance = require("./core/Performance");
ter.Game = require("./core/Game");
ter.Functions = require("./core/GameFunctions");
ter.Common = require("./core/Common");
ter.Ticker = require("./core/Ticker");


ter.Node = require("./node/Node");
ter.World = require("./node/World");

ter.Engine = require("./physics/Engine");
ter.Bodies = require("./bodies/Bodies");

ter.Render = require("./render/RenderTypes");

vec = require("./geometry/vec");
ter.Grid = require("./geometry/Grid");
ter.Bezier = require("./geometry/Bezier");

ter.simplexNoise = require("./lib/simplexNoise");
ter.polyDecomp = require("./lib/poly-decomp");
