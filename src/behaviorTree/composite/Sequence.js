const BehaviorTree = require("../other/BehaviorTree");
const Composite = require("./Composite");
/**
 * Processes children in order. Fails as soon as any of its children fails. Succeeds if no children fail
 * @class Sequence
 * @extends Composite
 * @memberof module:BehaviorTreeStuff
 */
class Sequence extends Composite { // AND, returns failure at first failure, success if no children fail
	static toString() {
		return "Sequence";
	}

	constructor(options) {
		super(options);
		this.toString = Sequence.toString;
	}
	tick(blackboard) {
		let children = this.children;
		let node = this;
		return new Promise(resolve => {
			this.resolve = resolve;
			let i = 0;
			function next() {
				children[i].tick(blackboard).then(result => {
					if (node.hasInterrupt) {
						node.hasInterrupt = false;
						return;
					}
					if (result == BehaviorTree.SUCCESS) {
						if (++i >= children.length) {
							resolve(BehaviorTree.SUCCESS);
						}
						else {
							next();
						}
					}
					else {
						resolve(result);
					}
				});
			}
			next();
		});
	}
}
BehaviorTree.registerType(Sequence);
module.exports.Sequence = Sequence;