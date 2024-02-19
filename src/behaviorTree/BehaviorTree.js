"use strict";

/**
 * Behavior tree objects
 * @namespace BehaviorTree
 */
let BehaviorTree = module.exports = {
	BehaviorTree: require("./other/BehaviorTree"),
	Leaf: require("./other/Leaf"),

	Composite: require("./composite/Composite"),
	Selector: require("./composite/Selector"),
	Sequence: require("./composite/Sequence"),

	Decorator: require("./decorator/Decorator"),
	Inverter: require("./decorator/Inverter"),
	Repeat: require("./decorator/Repeat"),
	RepeatUntilFail: require("./decorator/RepeatUntilFail"),
	Succeeder: require("./decorator/Succeeder"),

}
module.exports = BehaviorTree;