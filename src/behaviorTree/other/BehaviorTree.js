
/**
 * A behavior tree for making game AI and complex decision systems
 * @class BehaviorTree
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
	 * 
	 * @param {Object} tree - Object to create tree from
	 * @param {Object} [blackboard = {}] - Optional default blackboard that is shared between all nodes
	 * @example
	 * let behaviors = new BehaviorTree({
	 * 	type: "Repeat",
	 * 	count: 3,
	 * 	child: {
	 * 		type: "Leaf",
	 * 		callback: (resolve, blackboard) => {
	 * 			// game logic goes here
	 * 		}
	 * 	}
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
BehaviorTree.registerType(BehaviorTree);