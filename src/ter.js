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
ter.RenderMethods = require("./render/RenderMethods");
ter.Graph = require("./render/Graph");
ter.Sprite = require("./render/Sprite");
ter.Spritesheet = require("./render/Spritesheet");

ter.vec = require("./geometry/vec");
ter.Grid = require("./geometry/Grid");
ter.Bezier = require("./geometry/Bezier");
ter.Bounds = require("./geometry/Bounds");

ter.Inputs = require("./other/Inputs");
ter.Animation = require("./other/Animation");
ter.DiscreteAnimation = require("./other/DiscreteAnimation");
