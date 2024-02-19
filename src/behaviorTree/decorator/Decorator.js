const BehaviorTree = require("../other/BehaviorTree");
/**
 * Has one child. Modifies the output in some way.
 * @class Decorator
 */
class Decorator { // Has 1 child, transforms result / repeats / terminates
	static toString() {
		return "Decorator";
	}

	constructor({ child }) {
		this.id = ++BehaviorTree.id;
		this.child = child;
		this.toString = Decorator.toString;
	}
	interrupt(value = BehaviorTree.FAILURE) {
		this.child.interrupt(value);
		
		if (this.resolve) {
			this.resolve(value);
			this.hasInterrupt = true;
		}
	}
}
BehaviorTree.registerType(Decorator);
module.exports.Decorator = Decorator;