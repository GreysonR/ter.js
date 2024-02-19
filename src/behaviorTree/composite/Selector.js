const BehaviorTree = require("../other/BehaviorTree");
const Composite = require("./Composite");
/**
 * Processes children in order. Succeeds and stops processing at the first child that succeeds. Fails if no child succeeds
 * @class Selector
 * @extends Composite
 */
class Selector extends Composite { // OR, returns success at first success / running, failure if all children fail
	static toString() {
		return "Selector";
	}

	constructor(options) {
		super(options);
		this.toString = Selector.toString;
	}
	tick(blackboard) {
		let node = this;
		let children = this.children;
		return new Promise((resolve, reject) => {
			this.resolve = resolve;
			let i = 0;
			function next() {
				children[i].tick(blackboard).then(result => {
					if (node.hasInterrupt) {
						node.hasInterrupt = false;
						return;
					}
					if (result == BehaviorTree.SUCCESS) {
						resolve(result);
					}
					else {
						if (++i >= children.length) {
							resolve(BehaviorTree.FAILURE);
						}
						else {
							next();
						}
					}
				});
			}
			next();
		});
	}
}
BehaviorTree.registerType(Selector);
module.exports.Selector = Selector;