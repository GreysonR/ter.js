"use strict";

/**
	 * A behavior tree can be used to express complex logic and decision making. It's especially useful for game AI. See [here](https://www.gamedeveloper.com/programming/behavior-trees-for-ai-how-they-work) to learn more about behavior trees.
	 * Ter.js's behavior tree has several built in types:
	 * 
	 * ## Composites
	 * Composites can have multiple children, defined in the `children` array.
	 * 
	 * ### Selector
	 * A selector is a composite that executes its children until the first success. Once this happens, it returns a success. If none of its children succeed, it fails.
	 * It is essentially a logical OR statement.
	 * 
	 * ### Sequence
	 * A sequence is a composite that executes all its children until the first failure. If all its children succeed, it succeeds. If any of its children fail, it fails.
	 * It is like a logical AND statement.
	 * 
	 * ## Decorators
	 * Decorators have **only one** child. They modify the output of their child in some way, such as always failing or repeating.
	 * 
	 * ### Inverter
	 * Inverts the output of its child. If its child succeeds, it fails. If its child fails, it succeeds.
	 * 
	 * ### Succeeder
	 * Always succeeds, no matter what its child's output is.
	 * 
	 * ### Repeat
	 * Repeats `n` times, specified by the `count` option. It succeeds when it finishes running and never fails.
	 * 
	 * ### RepeatUntilFail
	 * Repeats `n` times, or infinite times by default, specified by the `count` option. It succeeds if it runs `n` times, or fails if its child ever fails.
	 * 
	 * ## Leaf
	 * The leaf node is where the logic of the tree goes. It has a `callback` that has `resolve` and `blackboard` parameters. Call `resolve(BehaviorTree.SUCCESS)` to indicate the leaf successfully finished running, or `resolve(BehaviorTree.FAILURE)` to tell the tree the leaf failed. 
	 * The blackboard is an object that is shared across all nodes that can be used as memory for the AI agent.
	 * 
	 * ## Reusing trees
	 * You can reuse trees or parts of trees by registering them. To do that, use `BehaviorTree.registerTree(name, tree)`:
	 * ```
	 * BehaviorTree.registerTree("isAlive", {
	 * 	type: "Leaf",
	 * 	callback: (resolve, blackboard) => {
	 * 		let { health } = blackboard;
	 * 		let alive = health > 0 && !body.removed;
	 * 		if (alive) {
	 * 			resolve(BehaviorTree.SUCCESS);
	 * 		}
	 * 		else {
	 * 			resolve(BehaviorTree.FAILURE);
	 * 		}
	 * 	}
	 * 
	 * });
	 * ```
	 * This would create a behavior tree that might check if the agent is alive. To use this tree, simply add its name as a string:
	 * ```
	 * let agentBehavior = new BehaviorTree({
	 * 	type: "Sequence",
	 * 	children: [
	 * 		"isAlive", // <--- Registered tree is used here
	 * 		{
	 *	 		type: "Leaf",
	 *	 		callback: (resolve, blackboard) => {
	 * 				// logic goes here
	 *	 		}
	 * 		},
	 * 	]
	 * });
	 * ```
	 * This will insert the `isAlive` tree into the new tree created. In this case, it would check if the agent is alive, then do some other task if it is.
 */
class BehaviorTree {
	static FAILURE = 0;
	static SUCCESS = 1;
	// RUNNING state not necessary in this implementation
	static globalTrees = {};
	static call(name, resolve, blackboard = {}) {
		let tree = this.globalTrees[name];
		if (!tree) {
			throw new Error(`No registered tree of name: ${ name }`);
		}
		tree.tick(blackboard).then(result => resolve(result));
	}
	static nodes = {};
	static parse(node) {
		let nodeType;
		if (typeof node == "string") {
			if (!BehaviorTree.globalTrees[node]) {
				throw new Error("No registered tree of name: " + node);
			}
			node = BehaviorTree.globalTrees[node];
		}
		let tmp = {};
		Common.merge(tmp, node);
		node = tmp;

		nodeType = BehaviorTree.nodes[node.type ?? node.toString()];
		if (!nodeType) {
			throw new Error("No node of type: " + node.type + ", " + node);
		}
		
		if (node.child) {
			node.child = BehaviorTree.parse(node.child);
		}
		if (node.children) {
			for (let i = 0; i < node.children.length; ++i) {
				node.children[i] = BehaviorTree.parse(node.children[i]);
			}
		}
		
		let nodeObject = new nodeType(node, node?.blackboard);
		return nodeObject;
	}
	static registerType(_class) {
		this.nodes[_class] = _class;
	}
	static registerTree(name, tree) {
		this.globalTrees[name] = tree;
	}
	static toString() {
		return "BehaviorTree";
	}
	static id = -1;
	blackboard = {};
	head = null;

	/**
	 * @param {Object} tree - Object to create tree from *or* string of registered tree
	 * @param {Object} [blackboard = {}] - Blackboard that is shared between all nodes
	 * @example
	 * let behaviors = new BehaviorTree({
	 * 	type: "Selector",
	 * 	children: [
	 * 		{
	 *	 		type: "RepeatUntilFail",
	 *			count: 3,
	 *	 		child: {
	 * 				type: "Leaf",
	 *	 			callback: (resolve, blackboard) => {
	 *	 				// logic goes here
	 *	 			}
	 *	 		}
	 * 		},
	 * 		{
	 *	 		type: "Leaf",
	 *	 		callback: (resolve, blackboard) => {
	 *	 			// logic goes here
	 *	 		}
	 * 		}
	 * 	]
	 * });
	 */
	constructor(tree, blackboard = {}) {
		this.id = ++BehaviorTree.id;
		this.toString = BehaviorTree.toString;

		// Create blackboard
		this.blackboard = blackboard;

		if ((tree.type ?? tree.toString()) === "BehaviorTree") {
			this.blackboard = tree.blackboard;
			this.head = BehaviorTree.parse(tree.head);
		}
		else {
			// parse tree
			this.head = BehaviorTree.parse(tree);
		}
	}
	tick(blackboard = this.blackboard) {
		return this.head.tick(blackboard);
	}
	interrupt(value = BehaviorTree.FAILURE) {
		this.head.interrupt(value);
	}
}

//
// Composites
//
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

//
// Decorators
//
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


//
// Leafs
//
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

BehaviorTree.registerType(BehaviorTree);
BehaviorTree.registerType(Composite);
BehaviorTree.registerType(Selector);
BehaviorTree.registerType(Sequence);
BehaviorTree.registerType(Decorator);
BehaviorTree.registerType(Inverter);
BehaviorTree.registerType(Repeat);
BehaviorTree.registerType(RepeatUntilFail);
BehaviorTree.registerType(Succeeder);
BehaviorTree.registerType(Leaf);
module.exports = {
	BehaviorTree: BehaviorTree,
	Leaf: Leaf,

	Composite: Composite,
	Selector: Selector,
	Sequence: Sequence,

	Decorator: Decorator,
	Inverter: Inverter,
	Repeat: Repeat,
	RepeatUntilFail: RepeatUntilFail,
	Succeeder: Succeeder,

}
