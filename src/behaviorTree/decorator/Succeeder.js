const BehaviorTree = require("../other/BehaviorTree");
const Decorator = require("./Decorator");
/**
 * Always succeeds, even if child fails.
 * @class Succeeder
 * @extends Decorator
 */
class Succeeder extends Decorator { // Always returns SUCCESS
	static toString() {
		return "Succeeder";
	}

	constructor(options) {
		super(options);
		this.toString = Succeeder.toString;
	}
	tick(blackboard) {
		let child = this.child;
		let node = this;
		return new Promise(resolve => {
			this.resolve = resolve;
			child.tick(blackboard).then(result => {
				if (node.hasInterrupt) {
					node.hasInterrupt = false;
					return;
				}
				resolve(BehaviorTree.SUCCESS);
			});
		});
	}
}
BehaviorTree.registerType(Succeeder);
module.exports.Succeeder = Succeeder;