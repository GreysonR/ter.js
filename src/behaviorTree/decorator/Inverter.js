const BehaviorTree = require("../other/BehaviorTree");
const Decorator = require("./Decorator");
/**
 * Inverts the child's output: fails if child succeeds, succeeds if child fails.
 * @class Inverter
 * @extends Decorator
 */
class Inverter extends Decorator { // Inverts result, SUCCESS -> FAILURE, FAILURE -> SUCCESS
	static toString() {
		return "Inverter";
	}

	constructor(options) {
		super(options);
		this.toString = Inverter.toString;
	}
	tick(blackboard) {
		let node = this;
		return new Promise(resolve => {
			if (node.hasInterrupt) {
				node.hasInterrupt = false;
				return;
			}
			this.resolve = resolve;
			this.child.tick(blackboard).then(result => {
				resolve(Number(!result));
			});
		});
	}
}
BehaviorTree.registerType(Inverter);
module.exports.Inverter = Inverter;