let ter = module.exports;

ter.Game = require("./core/Game");
ter.Common = require("./core/Common");
ter.Ticker = require("./core/Ticker");
ter.Performance = require("./core/Performance");


ter.Node = require("./node/Node");
ter.World = require("./node/World");

ter.Engine = require("./physics/Engine");
ter.Bodies = require("./bodies/Bodies");

ter.Render = require("./render/RenderTypes");
ter.Graph = require("./render/Graph");

vec = require("./geometry/vec");
ter.Grid = require("./geometry/Grid");
ter.Bezier = require("./geometry/Bezier");
ter.Bounds = require("./geometry/Bounds");

ter.simplexNoise = require("./lib/simplexNoise");
ter.polyDecomp = require("./lib/poly-decomp");

ter.BehaviorTree = require("./behaviorTree/BehaviorTree");
ter.Functions = require("./extra/GameFunctions");
