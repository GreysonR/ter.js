const BehaviorTree = require("../other/BehaviorTree");
/**
 * Logic of behavior tree. Has a callback which is called every tick
 * @class Leaf
 */
class Leaf { // Logic of the tree; calls `callback` every tick, which is the actual tree code
	static toString() {
		return "Leaf";
	}
	constructor({ callback }) {
		this.id = ++BehaviorTree.id;
		this.callback = callback;
		this.toString = Leaf.toString;
	}
	tick(blackboard) {
		return new Promise(resolve => {
			this.resolve = resolve;
			this.callback(resolve, blackboard);
		});
	}
	interrupt(value = BehaviorTree.FAILURE) {
		if (this.resolve) {
			this.resolve(value);
		}
	}
}
BehaviorTree.registerType(Leaf);
module.exports.Leaf = Leaf;
