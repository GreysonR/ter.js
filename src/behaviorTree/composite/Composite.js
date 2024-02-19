const BehaviorTree = require("../other/BehaviorTree");
/**
 * Behavior tree node that has one or more children and processes them in a specific order
 * @class Composite
 */
class Composite { // Has 1+ children, processes them in a certain order each tick
	static toString() {
		return "Composite";
	}

	constructor({ children = [] }) {
		this.id = ++BehaviorTree.id;
		this.children = children;
		this.toString = Composite.toString;
	}
	interrupt(value = BehaviorTree.FAILURE) {
		for (let child of this.children) {
			child.interrupt(value);
		}
		if (this.resolve) {
			this.hasInterrupt = true;
			this.resolve(value);
		}
	}
}
BehaviorTree.registerType(Composite);
module.exports.Composite = Composite;