const BehaviorTree = require("../other/BehaviorTree");
const Decorator = require("./Decorator");
/**
 * Repeats the child several times, or forever by default. Returns success if any of its children fail or if it repeats enough times
 * @class RepeatUntilFail
 * @extends Decorator
 */
class RepeatUntilFail extends Decorator { // Repeats child `count` times (default is Infinity), or until a child returns FAILURE; always returns SUCCESS
	static toString() {
		return "RepeatUntilFail";
	}
	count = Infinity;
	constructor(options) {
		super(options);
		this.toString = RepeatUntilFail.toString;
		this.count = options.count ?? Infinity;
	}
	tick(blackboard) {
		let curCount = 0;
		let maxCount = this.count;
		let child = this.child;
		let node = this;
		return new Promise(resolve => {
			this.resolve = resolve;
			function next() {
				child.tick(blackboard).then(result => {
					if (node.hasInterrupt) {
						node.hasInterrupt = false;
						return;
					}
					if (result == BehaviorTree.FAILURE) {
						resolve(BehaviorTree.SUCCESS);
					}
					else if (++curCount >= maxCount) {
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
BehaviorTree.registerType(RepeatUntilFail);
module.exports.RepeatUntilFail = RepeatUntilFail;