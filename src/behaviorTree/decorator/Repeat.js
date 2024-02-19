const BehaviorTree = require("../other/BehaviorTree");
const Decorator = require("./Decorator");
/**
 * Repeats the child several times. Does not stop if any of its children fail.
 * @class Repeat
 * @extends Decorator
 */
class Repeat extends Decorator { // Repeats child `count` times
	static toString() {
		return "Repeat";
	}

	count = 3;
	constructor(options) {
		super(options);
		this.toString = Repeat.toString;
		this.count = options.count ?? 3;
	}
	tick(blackboard) {
		let node = this;
		let curCount = 0;
		let maxCount = this.count;
		let child = this.child;
		return new Promise(resolve => {
			this.resolve = resolve;
			function next() {
				child.tick(blackboard).then(result => {
					if (node.hasInterrupt) {
						node.hasInterrupt = false;
						return;
					}
					if (++curCount >= maxCount) {
						resolve(BehaviorTree.SUCCESS);
					}
					else {
						next();
					}
				});
			}
			next();
		});
	}
}
BehaviorTree.registerType(Repeat);
module.exports.Repeat = Repeat;