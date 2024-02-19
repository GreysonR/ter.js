(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define("ter", [], factory);
	else if(typeof exports === 'object')
		exports["ter"] = factory();
	else
		root["ter"] = factory();
})(self, () => {
return /******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./src/behaviorTree/BehaviorTree.js":
/*!******************************************!*\
  !*** ./src/behaviorTree/BehaviorTree.js ***!
  \******************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


/**
 * Behavior tree objects
 * @namespace
 */
let BehaviorTree = module.exports = {
	BehaviorTree: __webpack_require__(/*! ./other/BehaviorTree */ "./src/behaviorTree/other/BehaviorTree.js"),
	Leaf: __webpack_require__(/*! ./other/Leaf */ "./src/behaviorTree/other/Leaf.js"),

	Composite: __webpack_require__(/*! ./composite/Composite */ "./src/behaviorTree/composite/Composite.js"),
	Selector: __webpack_require__(/*! ./composite/Selector */ "./src/behaviorTree/composite/Selector.js"),
	Sequence: __webpack_require__(/*! ./composite/Sequence */ "./src/behaviorTree/composite/Sequence.js"),

	Decorator: __webpack_require__(/*! ./decorator/Decorator */ "./src/behaviorTree/decorator/Decorator.js"),
	Inverter: __webpack_require__(/*! ./decorator/Inverter */ "./src/behaviorTree/decorator/Inverter.js"),
	Repeat: __webpack_require__(/*! ./decorator/Repeat */ "./src/behaviorTree/decorator/Repeat.js"),
	RepeatUntilFail: __webpack_require__(/*! ./decorator/RepeatUntilFail */ "./src/behaviorTree/decorator/RepeatUntilFail.js"),
	Succeeder: __webpack_require__(/*! ./decorator/Succeeder */ "./src/behaviorTree/decorator/Succeeder.js"),

}
module.exports = BehaviorTree;

/***/ }),

/***/ "./src/behaviorTree/composite/Composite.js":
/*!*************************************************!*\
  !*** ./src/behaviorTree/composite/Composite.js ***!
  \*************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const BehaviorTree = __webpack_require__(/*! ../other/BehaviorTree */ "./src/behaviorTree/other/BehaviorTree.js");
/**
 * Behavior tree node that has one or more children and processes them in a specific order
 * @class Composite
 */
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
BehaviorTree.registerType(Composite);
module.exports.Composite = Composite;

/***/ }),

/***/ "./src/behaviorTree/composite/Selector.js":
/*!************************************************!*\
  !*** ./src/behaviorTree/composite/Selector.js ***!
  \************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const BehaviorTree = __webpack_require__(/*! ../other/BehaviorTree */ "./src/behaviorTree/other/BehaviorTree.js");
const Composite = __webpack_require__(/*! ./Composite */ "./src/behaviorTree/composite/Composite.js");
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

/***/ }),

/***/ "./src/behaviorTree/composite/Sequence.js":
/*!************************************************!*\
  !*** ./src/behaviorTree/composite/Sequence.js ***!
  \************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const BehaviorTree = __webpack_require__(/*! ../other/BehaviorTree */ "./src/behaviorTree/other/BehaviorTree.js");
const Composite = __webpack_require__(/*! ./Composite */ "./src/behaviorTree/composite/Composite.js");
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

/***/ }),

/***/ "./src/behaviorTree/decorator/Decorator.js":
/*!*************************************************!*\
  !*** ./src/behaviorTree/decorator/Decorator.js ***!
  \*************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const BehaviorTree = __webpack_require__(/*! ../other/BehaviorTree */ "./src/behaviorTree/other/BehaviorTree.js");
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

/***/ }),

/***/ "./src/behaviorTree/decorator/Inverter.js":
/*!************************************************!*\
  !*** ./src/behaviorTree/decorator/Inverter.js ***!
  \************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const BehaviorTree = __webpack_require__(/*! ../other/BehaviorTree */ "./src/behaviorTree/other/BehaviorTree.js");
const Decorator = __webpack_require__(/*! ./Decorator */ "./src/behaviorTree/decorator/Decorator.js");
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

/***/ }),

/***/ "./src/behaviorTree/decorator/Repeat.js":
/*!**********************************************!*\
  !*** ./src/behaviorTree/decorator/Repeat.js ***!
  \**********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const BehaviorTree = __webpack_require__(/*! ../other/BehaviorTree */ "./src/behaviorTree/other/BehaviorTree.js");
const Decorator = __webpack_require__(/*! ./Decorator */ "./src/behaviorTree/decorator/Decorator.js");
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

/***/ }),

/***/ "./src/behaviorTree/decorator/RepeatUntilFail.js":
/*!*******************************************************!*\
  !*** ./src/behaviorTree/decorator/RepeatUntilFail.js ***!
  \*******************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const BehaviorTree = __webpack_require__(/*! ../other/BehaviorTree */ "./src/behaviorTree/other/BehaviorTree.js");
const Decorator = __webpack_require__(/*! ./Decorator */ "./src/behaviorTree/decorator/Decorator.js");
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

/***/ }),

/***/ "./src/behaviorTree/decorator/Succeeder.js":
/*!*************************************************!*\
  !*** ./src/behaviorTree/decorator/Succeeder.js ***!
  \*************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const BehaviorTree = __webpack_require__(/*! ../other/BehaviorTree */ "./src/behaviorTree/other/BehaviorTree.js");
const Decorator = __webpack_require__(/*! ./Decorator */ "./src/behaviorTree/decorator/Decorator.js");
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

/***/ }),

/***/ "./src/behaviorTree/other/BehaviorTree.js":
/*!************************************************!*\
  !*** ./src/behaviorTree/other/BehaviorTree.js ***!
  \************************************************/
/***/ (() => {


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

/***/ }),

/***/ "./src/behaviorTree/other/Leaf.js":
/*!****************************************!*\
  !*** ./src/behaviorTree/other/Leaf.js ***!
  \****************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const BehaviorTree = __webpack_require__(/*! ../other/BehaviorTree */ "./src/behaviorTree/other/BehaviorTree.js");
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


/***/ }),

/***/ "./src/bodies/Bodies.js":
/*!******************************!*\
  !*** ./src/bodies/Bodies.js ***!
  \******************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const Bodies = module.exports;
const { isClass } = __webpack_require__(/*! ../core/Common.js */ "./src/core/Common.js");

Bodies.RigidBody = __webpack_require__(/*! ../physics/RigidBody.js */ "./src/physics/RigidBody.js");
Bodies.Rectangle = __webpack_require__(/*! ../bodies/Rectangle.js */ "./src/bodies/Rectangle.js");

Bodies.createBodyFactory = function(Engine) {
	let factory = {};
	for (let type in Bodies) {
		if (isClass(Bodies[type])) {
			factory[type] = function(...args) {
				return new Bodies[type](Engine, ...args);
			}
		}
	}
	return factory;
}


/***/ }),

/***/ "./src/bodies/Rectangle.js":
/*!*********************************!*\
  !*** ./src/bodies/Rectangle.js ***!
  \*********************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const RigidBody = __webpack_require__(/*! ../physics/RigidBody.js */ "./src/physics/RigidBody.js");
const vec = __webpack_require__(/*! ../geometry/vec.js */ "./src/geometry/vec.js");
const PolygonRender = __webpack_require__(/*! ../render/PolygonRender.js */ "./src/render/PolygonRender.js");
const Sprite = __webpack_require__(/*! ../render/Sprite.js */ "./src/render/Sprite.js");

module.exports = class Rectangle extends RigidBody {
	static createVertices(width, height) {
		return [
			new vec(-width/2,  height/2),
			new vec( width/2,  height/2),
			new vec( width/2, -height/2),
			new vec(-width/2, -height/2),
		];
	}
	constructor(Engine, width, height, position, options = {}) {
		super(Engine, Rectangle.createVertices(width, height), position, options);

		this.width = width;
		this.height = height;
		this.nodeType = "Rectangle";
	}
	addPolygonRender(container, options) {
		let render = new PolygonRender({
			container: container,
			position: new vec(this.position),
			vertices: this.vertices,
			subtype: "rectangle",
			width: this.width,
			height: this.height,
			
			...options
		});
		if (this.added) render.add();
		this.addChild(render);
		
		return this;
	}
	addSprite(container, options) {
		let render = new Sprite({
			container: container,
			position: new vec(this.position),
			width: this.width,
			height: this.height,
			
			...options
		});
		if (this.added) render.add();
		this.addChild(render);

		return this;
	}
}


/***/ }),

/***/ "./src/core/Common.js":
/*!****************************!*\
  !*** ./src/core/Common.js ***!
  \****************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const vec = __webpack_require__(/*! ../geometry/vec.js */ "./src/geometry/vec.js");

/**
 * @namespace Common
 */
let Common = module.exports = {
	clamp: function(x, min, max) { // clamps x so that min <= x <= max
		return Math.max(min, Math.min(x, max));
	},
	angleDiff: function(angle1, angle2) { // returns the signed difference between 2 angles
		function mod(a, b) {
			return a - Math.floor(a / b) * b;
		}
		return mod(angle1 - angle2 + Math.PI, Math.PI * 2) - Math.PI;
	},
	modDiff: function(x, y, m = 1) { // returns the signed difference between 2 values with any modulo, ie 11 oclock is 2 hours from 1 oclock with m = 12
		function mod(a, b) {
			return a - Math.floor(a / b) * b;
		}
		return mod(x - y + m/2, m) - m/2;
	},

	/**
	 * @description Pairs 2 positive integers, returning a unique number for each possible pairing using elegant pairing - http://szudzik.com/ElegantPairing.pdf
	 * @param {Number} x - 1st number, must be positive integer
	 * @param {Number} y - 2nd number, must be positive integer
	 * @returns {Number} Unique number from those 
	 */
	pair: function(x, y) {
		if (x > y)
			return x*x + x + y;
		return y*y + x;
	},
	/**
	 * Takes a paired number and returns the x/y values that created that number
	 * @param {Number} n Paired number
	 * @returns {vec} Pair of x/y that created that pair
	 */
	unpair: function(n) {
		let z = Math.floor(Math.sqrt(n));
		let l = n - z * z;
		return l < z ? new vec(l, z) : new vec(z, l - z);
	},

	/**
	 * Pairs 2 positive integers, returning a unique number for each possible pairing using elegant pairing - http://szudzik.com/ElegantPairing.pdf
	 * Returns the same value if x/y are switched
	 * @param {Number} x - 1st number, must be positive integer
	 * @param {Number} y - 2nd number, must be positive integer
	 * @returns {Number} Unique number from those 
	 */
	pairCommon: function(x, y) { // Elegant pairing function, but gives the same result if x/y are switched
		if (x > y)
			return x*x + x + y;
		return y*y + y + x;
	},

	/**
	 * Calculates the center of mass of a convex body. Uses algorithm from https://bell0bytes.eu/centroid-convex/
	 * @param {Array} vertices - Array of `vec`s to find the center of 
	 * @returns 
	 */
	getCenterOfMass(vertices) {
		let centroid = new vec(0, 0);
		let det = 0;
		let tempDet = 0;
		let numVertices = vertices.length;

		for (let i = 0; i < vertices.length; i++) {
			let curVert = vertices[i];
			let nextVert = vertices[(i + 1) % numVertices];

			tempDet = curVert.x * nextVert.y - nextVert.x * curVert.y;
			det += tempDet;

			centroid.add2({ x: (curVert.x + nextVert.x) * tempDet, y: (curVert.y + nextVert.y) * tempDet });
		}

		centroid.div2(3 * det);

		return centroid;
	},

	/**
	 * Parses a color into its base hex code and alpha. Supports hex, hex with alpha, rgb, and rgba
	 * @param {String} originalColor - Color to be parsed
	 * @returns {Array} Array of [hex code, alpha] of parsed color
	 */
	parseColor: function(originalColor) {
		if (originalColor === "transparent") {
			return ["#000000", 0];
		}
		let color;
		let alpha = 1;

		if (originalColor[0] === "#" && originalColor.length === 9) { // is a hex code with alpha
			color = originalColor.slice(0, 7);
			alpha = parseInt(originalColor.slice(7), 16) / 256; // convert to decimel
		}
		else if (originalColor[0] === "#" && originalColor.length === 7) { // is a hex code w/0 alpha
			color = originalColor;
			alpha = 1;
		}
		else if (originalColor.slice(0, 4) === "rgb(") { // rgb
			color = originalColor.slice(originalColor.indexOf("(") + 1, originalColor.indexOf(")")).split(",");
			color = "#" + color.map(value => parseInt(value).toString(16).padStart(2, "0")).join("");
			alpha = 1;
		}
		else if (originalColor.slice(0, 5) === "rgba(") { // rgba
			color = originalColor.slice(originalColor.indexOf("(") + 1, originalColor.indexOf(")")).split(",");
			alpha = parseInt(color.pop()) / 255;
			color = "#" + color.map(value => parseInt(value).toString(16).padStart(2, "0")).join("");
		}
		return [color, alpha];
	},

	/**
	 * Deep copies `objB` onto `objA` in place.
	 * @param {Object} objA - First object
	 * @param {Object} objB - 2nd object, copied onto `objA`
	 * @param {Number} maxDepth - The maximum depth it can copy
	 * @returns {void}
	 */
	merge: function(objA, objB, maxDepth = Infinity, hash = new WeakSet()) {
		hash.add(objB);

		Object.keys(objB).forEach(option => {
			let value = objB[option];
			
			if (Array.isArray(value)) {
				objA[option] = [ ...value ];
			}
			else if (typeof value === "object" && value !== null) {
				if (maxDepth > 1) {
					if (hash.has(value)) { // Cyclic reference
						objA[option] = value;
						return;
					}
					if (typeof objA[option] !== "object") {
						objA[option] = {};
					}
					Common.merge(objA[option], value, maxDepth - 1, hash);
				}
				else {
					objA[option] = value;
				}
			}
			else {
				objA[option] = value;
			}
		});
	},
	
	/**
	 * Finds if a variable is a class in disguise
	 * @param {*} obj - Variable to check
	 * @returns {Boolean} If the variable is a class
	 */
	isClass: function(obj) {
		const isCtorClass = obj.constructor
			&& obj.constructor.toString().substring(0, 5) === 'class'
		if(obj.prototype === undefined) {
			return isCtorClass;
		}
		const isPrototypeCtorClass = obj.prototype.constructor 
			&& obj.prototype.constructor.toString
			&& obj.prototype.constructor.toString().substring(0, 5) === 'class'
		return isCtorClass || isPrototypeCtorClass;
	},

	/**
	 * Checks if line `a1`->`a2` is intersecting line `b1`->`b2`, and at what point
	 * @param {vec} a1 - Start of line 1
	 * @param {vec} a2 - End of line 1
	 * @param {vec} b1 - Start of line 2
	 * @param {vec} b2 - End of line 2
	 * @returns {vec} Point of intersection, or null if they don't intersect
	 */
	lineIntersects: function(a1, a2, b1, b2) { // tells you if lines a1->a2 and b1->b2 are intersecting, and at what point
		if (a1.x === a2.x || a1.y === a2.y) {
			a1 = new vec(a1);
		}
		if (b1.x === b2.x || b1.y === b2.y) {
			b1 = new vec(b1);
		}
		if (a1.x === a2.x)
			a1.x += 0.00001;
		if (b1.x === b2.x)
			b1.x += 0.00001;
		if (a1.y === a2.y)
			a1.y += 0.00001;
		if (b1.y === b2.y)
			b1.y += 0.00001;

		let d = (a1.x - a2.x) * (b1.y - b2.y) - (a1.y - a2.y) * (b1.x - b2.x);
		if (d === 0) return false;

		let nx = (a1.x * a2.y - a1.y * a2.x) * (b1.x - b2.x) - (a1.x - a2.x) * (b1.x * b2.y - b1.y * b2.x);
		let ny = (a1.x * a2.y - a1.y * a2.x) * (b1.y - b2.y) - (a1.y - a2.y) * (b1.x * b2.y - b1.y * b2.x);

		let pt = new vec(nx / d, ny / d);

		let withinX = pt.x > Math.min(a1.x, a2.x) && pt.x < Math.max(a1.x, a2.x) && pt.x > Math.min(b1.x, b2.x) && pt.x < Math.max(b1.x, b2.x);
		let withinY = pt.y > Math.min(a1.y, a2.y) && pt.y < Math.max(a1.y, a2.y) && pt.y > Math.min(b1.y, b2.y) && pt.y < Math.max(b1.y, b2.y);
		if (withinX && withinY) {
			return pt;
		}
		else {
			return null;
		}
	},

	/**
	 * Tests if line `a1`->`a2` is intersecting `body`
	 * @param {vec} a1 - Start of line
	 * @param {vec} a2 - End of line
	 * @param {RigidBody} body - Body to test
	 * @returns {Boolean} If the line is intersecting the body
	 */
	lineIntersectsBody: function(a1, a2, body) { // tells you if line a1->a2 is intersecting with body, returns true/false
		if (body.children.length > 0) {
			for (let child of body.children) {
				if (Common.lineIntersectsBody(a1, a2, child)) {
					return true;
				}
			}
			return false;
		}
		let ray = a2.sub(a1);
		let rayNormalized = ray.normalize();
		let rayAxes = [ rayNormalized, rayNormalized.normal() ];
		let rayVertices = [ a1, a2 ]; 

		function SAT(verticesA, verticesB, axes) {
			for (let axis of axes) {
				let boundsA = { min: Infinity, max: -Infinity };
				let boundsB = { min: Infinity, max: -Infinity };
				for (let vertice of verticesA) {
					let projected = vertice.dot(axis);
					if (projected < boundsA.min) {
						boundsA.minVertice
					}
					boundsA.min = Math.min(boundsA.min, projected);
					boundsA.max = Math.max(boundsA.max, projected);
				}
				for (let vertice of verticesB) {
					let projected = vertice.dot(axis);
					boundsB.min = Math.min(boundsB.min, projected);
					boundsB.max = Math.max(boundsB.max, projected);
				}

				if (boundsA.min > boundsB.max || boundsA.max < boundsB.min) { // they are NOT colliding on this axis
					return false;
				}
			}
			return true;
		}
		// SAT using ray axes and body axes
		return SAT(rayVertices, body.vertices, rayAxes) && SAT(rayVertices, body.vertices, body.axes);
	},

	/**
	 * Finds the static bodies around the ray from `start` to `end`. Useful for getting bodies when calling `Common.raycast` or `Common.raycastSimple`
	 * @param {vec} start - Start of ray
	 * @param {vec} end - End of ray
	 * @param {World} World - World to get bodies from
	 */
	getRayNearbyStaticBodies(start, end, World) {
		let grid = World.staticGrid;
		let size = grid.gridSize;
		let bounds = { min: start.min(end).div2(size).floor2(), max: start.max(end).div2(size).floor2() };
		bodies = new Set();

		for (let x = bounds.min.x; x <= bounds.max.x; x++) {
			for (let y = bounds.min.y; y <= bounds.max.y; y++) {
				let n = grid.pair(new vec(x, y));
				let node = grid.grid[n];

				if (node) {
					for (let body of node) {
						if (!bodies.has(body)) {
							bodies.add(body);
						}
					}
				}
			}
		}
	},
	getRayNearbyDynamicBodies(start, end, World) {
		let grid = World.dynamicGrid;
		let size = grid.gridSize;
		let bounds = { min: start.min(end).div2(size).floor2(), max: start.max(end).div2(size).floor2() };
		bodies = new Set();

		for (let x = bounds.min.x; x <= bounds.max.x; x++) {
			for (let y = bounds.min.y; y <= bounds.max.y; y++) {
				let n = grid.pair(new vec(x, y));
				let node = grid.grid[n];

				if (node) {
					for (let body of node) {
						if (!bodies.has(body)) {
							bodies.add(body);
						}
					}
				}
			}
		}
	},

	/**
	 * 
	 * @param {vec} start - Start of ray
	 * @param {vec} end - End of ray
	 * @param {Array} [bodies] - (Optional) Array of bodies to test
	 * @returns {Object} { collision: Boolean, distance: Number, point: vec, body: RigidBody, verticeIndex: Number }
	 */
	raycast: function(start, end, bodies) {
		let lineIntersects = Common.lineIntersects;
		let minDist = Infinity;
		let minPt = null;
		let minBody = null;
		let minVert = -1;

		for (let i = 0; i < bodies.length; i++) {
			let body = bodies[i];
			let { vertices } = body;
			let len = vertices.length;

			for (let i = 0; i < len; i++) {
				let cur = vertices[i];
				let next = vertices[(i + 1) % len];

				let intersection = lineIntersects(start, end, cur, next);
				if (intersection) {
					let dist = intersection.sub(start).length;
					if (dist < minDist) {
						minDist = dist;
						minPt = intersection;
						minBody = body;
						minVert = i;
					}
				}
			}
		}

		return {
			collision: minPt !== null,
			distance: minDist,
			point: minPt,
			body: minBody,
			verticeIndex: minVert,
		};
	},
	raycastSimple: function(start, end, bodies) { // raycast that only tells you if there is a collision (usually faster), returns true/false
		let lineIntersectsBody = Common.lineIntersectsBody;

		for (let body of bodies) {
			let intersection = lineIntersectsBody(start, end, body);
			if (intersection) {
				return true;
			}
		}
		return false;
	},
	boundCollision: function(boundsA, boundsB) { // checks if 2 bounds { min: vec, max: vec } are intersecting, returns true/false
		return (boundsA.max.x >= boundsB.min.x && boundsA.min.x <= boundsB.max.x && 
				boundsA.max.y >= boundsB.min.y && boundsA.min.y <= boundsB.max.y);
	},
	pointInBounds: function(point, bounds) { // checks if a point { x: x, y: y } is within bounds { min: vec, max: vec }, returns true/false
		return (point.x >= bounds.min.x && point.x <= bounds.max.x && 
				point.y >= bounds.min.y && point.y <= bounds.max.y);
	},

	/**
	 * Deletes first instance of `value` from `array`
	 * @param {Array} array Array item is deleted from
	 * @param {*} value Value deleted from array
	 */
	arrayDelete(array, value) {
		let index = array.indexOf(value);
		if (index !== -1) {
			array.splice(index, 1);
		}
	}
}


/***/ }),

/***/ "./src/core/Game.js":
/*!**************************!*\
  !*** ./src/core/Game.js ***!
  \**************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const World = __webpack_require__(/*! ../node/World.js */ "./src/node/World.js");
const Render = __webpack_require__(/*! ../render/Render.js */ "./src/render/Render.js");
const DebugRender = __webpack_require__(/*! ../render/DebugRender.js */ "./src/render/DebugRender.js");
const Engine = __webpack_require__(/*! ../physics/Engine.js */ "./src/physics/Engine.js");
const Common = __webpack_require__(/*! ../core/Common.js */ "./src/core/Common.js");
const PerformanceRender = __webpack_require__(/*! ../render/PerformanceRender.js */ "./src/render/PerformanceRender.js");
const Ticker = __webpack_require__(/*! ../core/Ticker.js */ "./src/core/Ticker.js");
const Bodies = __webpack_require__(/*! ../bodies/Bodies.js */ "./src/bodies/Bodies.js");

/**
 * Game object that handles physics, rendering, world, ticker, and more
 * @class Game
 */
module.exports = class Game {
	static defaultOptions = {
		World: World.defaultOptions,
		Render: Render.defaultOptions,
		Engine: Engine.defaultOptions,
		Ticker: Ticker.defaultOptions,
	}

	constructor(options = {}) {
		let defaults = { ...Game.defaultOptions };
		Common.merge(defaults, options, 2);
		options = defaults;

		this.World = new World(options.World);
		this.Engine = new Engine(this.World, options.Engine);
		this.Render = new Render(options.Render);
		this.Ticker = new Ticker(this, options.Ticker);
		this.Bodies = Bodies.createBodyFactory(this.Engine);
	}
	createDebugRender() {
		this.DebugRender = new DebugRender(this);

		let Performance = this.Engine.Performance;
		Performance.render = new PerformanceRender(Performance, this.Render);
		Performance.render.enabled = true;
	}
}


/***/ }),

/***/ "./src/core/Performance.js":
/*!*********************************!*\
  !*** ./src/core/Performance.js ***!
  \*********************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const PerformanceRender = __webpack_require__(/*! ../render/PerformanceRender */ "./src/render/PerformanceRender.js");

/**
 * Tracks performance stats of the game, like fps, delta time, and frame number
 * @class Performance
 */
module.exports = class Performance {
	getAvgs = true;
	#lastUpdate = 0;
	fps = 60;
	delta = 1;
	frame = 0;

	history = {
		avgFps: 60,
		avgDelta: 1,
		fps: [],
		delta: [],
	}
	engine = {
		delta: 0,
		lastUpdate: 0,
	}

	/**
	 * Creates a Performance object
	 * @param {Render} [Render] - Optional Render object to create a performance render
	 */
	constructor(Render = undefined) {
		if (Render) this.render = new PerformanceRender(this, Render);
		this.#lastUpdate = performance.now() / 1000;
	}

	/**
	 * @memberof Performance
	 * @method update
	 * @description Updates the performance stats. Should be called every frame
	 * @returns {void}
	 */
	update() {
		let curTime = performance.now() / 1000;
		if (curTime - this.#lastUpdate === 0) { // Instantly updating breaks everything
			return;
		}

		this.delta = Math.min(5, curTime - this.#lastUpdate);
		this.fps = 1 / this.delta;
		this.#lastUpdate = curTime;

		this.history.fps.push(this.fps);
		this.history.delta.push(this.delta);

		if (this.history.fps.length > 200) {
			this.history.fps.shift();
			this.history.delta.shift();
		}
		let fps = (() => {
			let v = 0;
			for (let i = 0; i < this.history.fps.length; i++) {
				v += this.history.fps[i];
			}
			return v / this.history.fps.length;
		})();
		let delta = (() => {
			let v = 0;
			for (let i = 0; i < this.history.delta.length; i++) {
				v += this.history.delta[i];
			}
			return v / this.history.delta.length;
		})();

		this.history.avgFps = fps;
		this.history.avgDelta = delta;
	}
};


/***/ }),

/***/ "./src/core/Ticker.js":
/*!****************************!*\
  !*** ./src/core/Ticker.js ***!
  \****************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const Common = __webpack_require__(/*! ../core/Common.js */ "./src/core/Common.js");

/**
 * A game ticker that handles updating the engine every frame.
 * @class Ticker
 */
module.exports = class Ticker {
	static defaultOptions = {
		pauseOnFreeze: true,
		freezeThreshold: 0.3,
	}

	/**
	 * Creates a ticker that runs on `Game` every frame.
	 * @param {Game} Game Game ticker should be run on
	 * @param {Object} options Options object, see documentation for options
	 */
	constructor(Game, options = {}) {
		let defaults = { ...Ticker.defaultOptions };
		Common.merge(defaults, options, 1);
		options = defaults;
		
		this.Game = Game;
		this.pauseOnFreeze   = options.pauseOnFreeze;
		this.freezeThreshold = options.freezeThreshold;

		this.tick = this.tick.bind(this);
		window.addEventListener("load", this.tick);
	}
	tick() {
		this.trigger("beforeTick");

		const { Engine } = this.Game;
		const { Performance } = Engine;
		if (this.pauseOnFreeze && Performance.fps / Math.max(1, Performance.history.avgFps) < this.freezeThreshold) {
			Performance.update();
		}
		else {
			Engine.update();
			// animations.run();
		}

		this.trigger("afterTick");
		requestAnimationFrame(this.tick);
	}
	
	#events = {
		beforeTick: [],
		afterTick: [],
	}
	on(event, callback) {
		if (this.#events[event]) {
			this.#events[event].push(callback);
		}
		else {
			console.warn(event + " is not a valid event");
		}
	}
	off(event, callback) {
		event = this.#events[event];
		if (event.includes(callback)) {
			event.splice(event.indexOf(callback), 1);
		}
	}
	trigger(event) {
		// Trigger each event
		if (this.#events[event]) {
			this.#events[event].forEach(callback => {
				callback();
			});
		}
	}
}


/***/ }),

/***/ "./src/extra/GameFunctions.js":
/*!************************************!*\
  !*** ./src/extra/GameFunctions.js ***!
  \************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const vec = __webpack_require__(/*! ../geometry/vec.js */ "./src/geometry/vec.js");

/**
 * @namespace
 */
let GameFunctions = module.exports = {
	// returns an array of index(es) that make up edges of voronoi region. 2 points if it's between 2 vertices, 1 point if it's between axes, 0 points if it's inside body
	getVoronoiRegion: function(body, point) { 
		let { vertices } = body;
		let length = vertices.length;
		for (let i = 0; i < length; i++) {
			let vertice = vertices[i];
			let nextVertice = vertices[(i + 1) % length];
			let vertToNext = nextVertice.sub(vertice);
			let axis = vertToNext.normalize();
			let normal = axis.normal();
			let vertToPoint = point.sub(vertice);


			let outside = vertToPoint.dot(normal) >= -10; // theoretically should be 0, but a bit of penetration is allowed in simulation
			let vpDotAxis = vertToPoint.dot(axis);
			let within = vpDotAxis >= 0 && vpDotAxis <= vertToNext.length;

			if (outside && within) {
				return [i, (i + 1) % length];
			}
			else { // check if between axis and lastAxis
				let lastVertice = vertices[(i - 1 + length) % length];
				let lastAxis = lastVertice.sub(vertice).normalize();
				if (vertToPoint.dot(lastAxis) < 0 && vpDotAxis < 0) {
					return [i];
				}
			}
		}
		return [];
	},
	closestPointBetweenBodies: function(bodyA, bodyB) { // returns the closest point on bodyB from the vertices of bodyA
		// should technically be run 2x for (bodyA, bodyB) and (bodyB, bodyA) to find the actual closest points
		let verticesA = bodyA.vertices;
		let verticesB = bodyB.vertices;
		let point = null;
		let minDistance = Infinity;
		for (let i = 0; i < verticesA.length; i++) {
			let verticeA = verticesA[i];
			let region = getVoronoiRegion(bodyB, verticeA);

			if (region.length > 0) {
				let projected;

				if (region.length === 1) {
					projected = new vec(verticesB[region[0]]);
				}
				else if (region.length === 2) {
					let pointBA = verticesB[region[0]];
					let pointBB = verticesB[region[1]];
					let axis = pointBB.sub(pointBA).normalize();
					projected = axis.mult(axis.dot(verticeA.sub(pointBA))).add(pointBA);	
				}

				let distance = projected.sub(verticeA).length;
				if (distance < minDistance) {
					minDistance = distance;
					point = projected;
				}
			}
		}
		return point;
	},
	closestEdgeBetweenBodies: function(bodyA, bodyB) { // returns the closest point and its normal (point and normal are only on bodyB)
		let verticesA = bodyA.vertices;
		let verticesB = bodyB.vertices;
		let point = null;
		let normal = new vec(1, 0);
		let minDistance = Infinity;
		for (let i = 0; i < verticesA.length; i++) {
			let verticeA = verticesA[i];
			let region = getVoronoiRegion(bodyB, verticeA);

			if (region.length > 0) {
				let projected;
				let curNormal;

				if (region.length === 1) {
					projected = new vec(verticesB[region[0]]);
					let prev = verticesB[(region[0] - 1 + verticesB.length) % verticesB.length];
					let next = verticesB[(region[0] + 1) % verticesB.length];
					let axisA = projected.sub(prev).normalize();
					let axisB = next.sub(projected).normalize();
					curNormal = axisA.add(axisB).normalize();
				}
				else if (region.length === 2) {
					let pointBA = verticesB[region[0]];
					let pointBB = verticesB[region[1]];
					let axis = pointBB.sub(pointBA).normalize();
					projected = axis.mult(axis.dot(verticeA.sub(pointBA))).add(pointBA);
					curNormal = axis;
				}

				let distance = projected.sub(verticeA).length;
				if (distance < minDistance) {
					minDistance = distance;
					point = projected;
					normal = curNormal.normal();
				}
			}
		}
		return {
			point: point,
			normal: normal,
		};
	},

	createGradient: function(startPosition, endPosition, colorStops = [["#ff0000ff", 0], ["#ff000000", 1]]) {
		let gradient = ctx.createLinearGradient(startPosition.x, startPosition.y, endPosition.x, endPosition.y);
		for (let colorStop of colorStops) {
			gradient.addColorStop(colorStop[1], colorStop[0]);
		}
		return gradient;
	},
	createRadialGradient: function(position, radius, colorStops = [["#ff0000ff", 0], ["#ff000000", 1]]) {
		let gradient = ctx.createRadialGradient(position.x, position.y, 0, position.x, position.y, radius);
		for (let colorStop of colorStops) {
			gradient.addColorStop(colorStop[1], colorStop[0]);
		}
		return gradient;
	},

	createElement: function(type, properties) {
		let elem = document.createElement(type);

		function addProperties(elem, properties) {
			Object.keys(properties).forEach(property => {
				if (typeof properties[property] === "object" && !Array.isArray(property) && !(properties[property] instanceof Element)) {
					addProperties(elem[property], properties[property]);
				}
				else {
					if (property === "class") {
						let classes = typeof properties[property] === "string" ? properties[property].split(" ") : properties[property];
						for (let className of classes) {
							elem.classList.add(className);
						}
					}
					else if (property === "parent") {
						properties[property].appendChild(elem);
					}
					else {
						elem[property] = properties[property];
					}
				}
			});
		}
		addProperties(elem, properties);

		return elem;
	},
	gaussianRandom: function(mean = 0, stdev = 1, random = Math.random) { // Standard Normal distribution using Box-Muller transform https://stackoverflow.com/a/36481059
		let u = 1 - random();
		let v = random();
		let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
		return z * stdev + mean;
	},
	createSeededRandom: function(seed) { // Returns function that generates numbers between [0, 1). Adaptation of https://stackoverflow.com/a/19301306
		var mask = 0xffffffff;
		var m_w = (123456789 + seed) & mask;
		var m_z = (987654321 - seed) & mask;
		
		return function() {
			m_z = (36969 * (m_z & 65535) + (m_z >> 16)) & mask;
			m_w = (18000 * (m_w & 65535) + (m_w >> 16)) & mask;
			var result = ((m_z << 16) + (m_w & 65535)) >>> 0;
			result /= 4294967296;
			return result;
		}
	},
	setCSSVariable: function(varName, value) {
		root.style.setProperty(`--${varName}`, value);
	},

	boundedRandom: function([min, max]) {
		return Math.random() * (max - min) + min;
	},
	boundedRandomPoint: function(bounds) {
		return new vec(boundedRandom([bounds.min.x, bounds.max.x]), boundedRandom([bounds.min.y, bounds.max.y]));
	},
	getMovementDirections: function(direction, threshold = 0.5) {
		direction = direction.normalize();

		let directionNames = {};
		if (direction.x > threshold) {
			directionNames.right = true;
		}
		else if (direction.x < -threshold) {
			directionNames.left = true;
		}
		if (direction.y > threshold) {
			directionNames.down = true;
		}
		else if (direction.y < -threshold) {
			directionNames.up = true;
		}
		return directionNames;
	},
	setMovementDirections: function(controls, directions) {
		for (let controlName of Object.keys(directions)) {
			controls[controlName] = directions[controlName];
		}
	},
	createTilingArea: function(areaBody, sprite) { // REMOVE and replace with its own render class
		let texture = PIXI.Texture.from(sprite);
		let { angle, position } = areaBody;
		areaBody.setAngle(0);
		let size = areaBody.bounds.max.sub(areaBody.bounds.min);
		let tiling = new PIXI.TilingSprite(texture, size.x, size.y);
		tiling.zIndex = -1;
		mainWorld.addChild(tiling);

		let spritePos = size.mult(-0.5);
		let curPosition = position.add(spritePos.rotate(angle));
		tiling.rotation = angle;
		tiling.position.set(curPosition.x, curPosition.y);
		tiling.spritePos = spritePos;

		tiling.delete = function() {
			mainWorld.removeChild(tiling);
			tiling.destroy();
		}

		areaBody.setAngle(angle);

		return tiling;
	},
}


/***/ }),

/***/ "./src/geometry/Bezier.js":
/*!********************************!*\
  !*** ./src/geometry/Bezier.js ***!
  \********************************/
/***/ ((module) => {

"use strict";


/**
 * A bezier curve 
 * @class Bezier
 */
module.exports = class Bezier {
	constructor(pt1, cp1, cp2, pt2) { // start, control 1, control 2, end
		// https://javascript.info/bezier-curve
		// P = ((1−t)^3 * P1) + (3(1−t)^2 * t * P2) + (3(1−t) * t^2 * P3) + (t^3 * P4)
		// arc length = ∫a^b √[1 + (dy/dx)^2] dx
		// arc length = ∫a^b

		if (pt1.a && pt1.b) {
			this.a = new vec(pt1.a);
			this.b = new vec(pt1.b);
			this.c = new vec(pt1.c);
			this.d = new vec(pt1.d);
		}
		else {
			this.a = new vec(pt1);
			this.b = new vec(cp1);
			this.c = new vec(cp2);
			this.d = new vec(pt2);
		}

		this.length = this.getLength();
	}
	getAtT(t) {
		let x = (this.a.x * (1 - t)**3) + (3*this.b.x * t * (1 - t)**2) + (3*this.c.x * (1 - t) * t**2) + (this.d.x * t**3);
		let y = (this.a.y * (1 - t)**3) + (3*this.b.y * t * (1 - t)**2) + (3*this.c.y * (1 - t) * t**2) + (this.d.y * t**3);

		return new vec(x, y);
	}
	getLength(dt = 0.01) {
		let lastPt = this.getAtT(0);
		let len = 0;
		for (let t = dt; t <= 1; t += dt) {
			let pt = this.getAtT(t);
			len += pt.sub(lastPt).length;
			lastPt = pt;
		}
		len += this.getAtT(1).sub(lastPt).length;

		return len;
	}
	get(d) {
		return this.getAtT(d / this.length);
	}
	getDxAtT(t) { // 1st derivative
		let x = 3 * ((this.d.x - 3*this.c.x + 3*this.b.x - this.a.x) * t ** 2 + (2*this.c.x - 4*this.b.x + 2*this.a.x) * t + this.b.x - this.a.x);
		let y = 3 * ((this.d.y - 3*this.c.y + 3*this.b.y - this.a.y) * t ** 2 + (2*this.c.y - 4*this.b.y + 2*this.a.y) * t + this.b.y - this.a.y);

		return new vec(x, y);
	}
	getDx(d) {
		return this.getDxAtT(d / this.length);
	}
	getDx2AtT(t) { // 2nd derivative
		let x = 6 * ((this.d.x - 3*this.c.x + 3*this.b.x - this.a.x) * t + this.c.x - 2*this.b.x + this.a.x);
		let y = 6 * ((this.d.y - 3*this.c.y + 3*this.b.y - this.a.y) * t + this.c.y - 2*this.b.y + this.a.y);

		return new vec(x, y);
	}
	getDx2(d) {
		return this.getDx2AtT(d / this.length);
	}

	render() {
		ctx.beginPath();
		for (let t = 0; t < this.length; t += 10) {
			let pt = this.get(t);

			if (t === 0) {
				ctx.moveTo(pt.x, pt.y);
			}
			else {
				ctx.lineTo(pt.x, pt.y);
			}
		}
		ctx.strokeStyle = "#ff0000";
		ctx.lineWidth = 1 / camera.scale;
		ctx.stroke();
	}
	renderDx() {
		ctx.strokeStyle = "#000000";
		ctx.lineWidth = 1 / camera.scale;


		for (let t = 10; t < this.length; t += 10) {
			let pt = this.get(t);
			let lastPt = this.get(t - 10);

			ctx.lineWidth = this.getDx(t).length ** 2 * 0.0001 / camera.scale;

			ctx.beginPath();
			ctx.moveTo(lastPt.x, lastPt.y);
			ctx.lineTo(pt.x, pt.y);
			ctx.stroke();

		}
	}
	toObject() {
		return {
			a: this.a.toObject(),
			b: this.b.toObject(),
			c: this.c.toObject(),
			d: this.d.toObject(),
		};
	}
}


/***/ }),

/***/ "./src/geometry/Bounds.js":
/*!********************************!*\
  !*** ./src/geometry/Bounds.js ***!
  \********************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const vec = __webpack_require__(/*! ../geometry/vec */ "./src/geometry/vec.js");

/**
 * @class Bounds
 * AABB bounds
 */
module.exports = class Bounds {
	min = new vec(0, 0);
	max = new vec(0, 0);
	constructor(min, max) {
		if (Array.isArray(min)) { // min is an array of vecs
			this.update(min);
		}
		else if (min.min && min.max) { // min is a bounds object
			this.min.set(min.min);
			this.max.set(min.max);
		}
		else { // min and max are vectors
			this.min.set(min);
			this.max.set(max);
		}
	}

	/**
	 * Updates the bounds based on an array vertices
	 * @param {Array} - Array of vertices 
	 */
	update(vertices) {
		let minX = Infinity, minY = Infinity;
		let maxX = -Infinity, maxY = -Infinity;
	
		for (let i = 0; i < vertices.length; i++) {
			let v = vertices[i];
	
			if (v.x < minX) minX = v.x;
			if (v.x > maxX) maxX = v.x;
			if (v.y < minY) minY = v.y;
			if (v.y > maxY) maxY = v.y;
		}
	
		this.min.x = minX;
		this.min.y = minY;
		this.max.x = maxX;
		this.max.y = maxY;
	}

	/**
	 * Creates a random point within the bounds
	 * @returns {vec} Random point within bounds
	 */
	randomPoint() {

	}
}


/***/ }),

/***/ "./src/geometry/Grid.js":
/*!******************************!*\
  !*** ./src/geometry/Grid.js ***!
  \******************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const { arrayDelete } = __webpack_require__(/*! ../core/Common.js */ "./src/core/Common.js");

/**
 * A broadphase grid that can handle bodies and points
 * @class Grid
 */
module.exports = class Grid {
	static id = 0;
	grid = {};
	gridIds = new Set();
	gridSize = 2000;
	constructor(size = 2000) {
		this.gridSize = size;
		this.id = Grid.id++;
	}
	pair = function(pos) {
		let x = pos.x >= 0 ? pos.x * 2 : pos.x * -2 - 1;
		let y = pos.y >= 0 ? pos.y * 2 : pos.y * -2 - 1;
		return (x >= y) ? (x * x + x + y) : (y * y + x);
	}
	unpair = function(n) {
		let sqrtz = Math.floor(Math.sqrt(n));
		let sqz = sqrtz * sqrtz;
		let result1 = ((n - sqz) >= sqrtz) ? new vec(sqrtz, n - sqz - sqrtz) : new vec(n - sqz, sqrtz);
		let x = result1.x % 2 === 0 ? result1.x / 2 : (result1.x + 1) / -2;
		let y = result1.y % 2 === 0 ? result1.y / 2 : (result1.y + 1) / -2;
		return new vec(x, y);
	}
	getBounds = function(body) {
		let size = this.gridSize;
		if (typeof body.bounds === "object") {
			return {
				min: body.bounds.min.div(size).floor2(),
				max: body.bounds.max.div(size).floor2(),
			}
		}
		else if (body.x !== undefined && body.y !== undefined) {
			let x = Math.floor(body.x / size);
			let y = Math.floor(body.y / size);
			return {
				min: new vec(x, y),
				max: new vec(x, y),
			}
		}
	}
	getBucketIds = function(bounds) {
		let ids = [];
		for (let x = bounds.min.x; x <= bounds.max.x; x++) {
			for (let y = bounds.min.y; y <= bounds.max.y; y++) {
				let n = this.pair(new vec(x, y));

				if (this.grid[n]) {
					ids.push(n);
				}
			}
		}

		return ids;
	}

	addBody = function(body) {
		let bounds = this.getBounds(body);

		if (!body._Grids) body._Grids = {};
		if (!body._Grids[this.id]) body._Grids[this.id] = [];

		for (let x = bounds.min.x; x <= bounds.max.x; x++) {
			for (let y = bounds.min.y; y <= bounds.max.y; y++) {
				let n = this.pair(new vec(x, y));

				body._Grids[this.id].push(n);
				if (!this.grid[n]) {
					this.grid[n] = [];
					this.gridIds.add(n);
				}
				this.grid[n].push(body);
			}
		}
	}
	removeBody = function(body) {
		for (let n of body._Grids[this.id]) {
			let node = this.grid[n];
			if (node) {
				arrayDelete(node, body);
				if (node.length === 0) {
					delete this.grid[n];
					this.gridIds.delete(n);
				}
			}
		}
	}
	addPoint = function(point) {
		if (!point._Grids) point._Grids = {};
		if (!point._Grids[this.id]) point._Grids[this.id] = [];

		let position = point.x ? point : point.position;
		let bucketPos = position.div(this.gridSize).floor2();
		let n = this.pair(bucketPos);
		point._Grids[this.id].push(n);
		if (!this.grid[n]) {
			this.grid[n] = [];
			this.gridIds.add(n);
		}
		this.grid[n].push(point);
	}
	removePoint = function(point) {
		if (!point._Grids) console.log(point._Grids);
		for (let n of point._Grids[this.id]) {
			let node = this.grid[n];
			if (node) {
				arrayDelete(node, point);
				if (node.length === 0) {
					delete this.grid[n];
					this.gridIds.delete(n);
				}
			}
		}
	}
	updateBody = function(body) {
		let curNodes = body._Grids[this.id];
		let oldNodes = new Set(curNodes);
		let bounds = this.getBounds(body);

		for (let x = bounds.min.x; x <= bounds.max.x; x++) {
			for (let y = bounds.min.y; y <= bounds.max.y; y++) {
				let n = this.pair(new vec(x, y));

				if (!oldNodes.has(n)) {
					curNodes.push(n);
					if (!this.grid[n]) {
						this.grid[n] = [];
						this.gridIds.add(n);
					}
					this.grid[n].push(body);
				}
				else {
					oldNodes.delete(n);
				}
			}
		}

		for (let n of oldNodes) {
			let node = this.grid[n];
			arrayDelete(curNodes, n);
			if (!node) continue;
			arrayDelete(node, body);
			if (node.length === 0) {
				delete this.grid[n];
				this.gridIds.delete(n);
			}
		}
	}
}


/***/ }),

/***/ "./src/geometry/vec.js":
/*!*****************************!*\
  !*** ./src/geometry/vec.js ***!
  \*****************************/
/***/ ((module) => {

/**
 * @class vec
 * @description A 2d vector
 */
module.exports = class vec {
	/**
	 * @memberof vec
	 * @description Creates a new vector
	 * @param {*} x - The x coordinate
	 * @param {*} y  - The y coordinate
	 * @returns {vec} `this`
	 */
	constructor(x, y) {
		if (typeof x === "object") {
			if (Array.isArray(x)) {
				this.x = x[0];
				this.y = x[1];
			}
			else {
				this.x = x.x;
				this.y = x.y;
			}
		}
		else if (typeof x === "number" && y === undefined) {
			this.x = Math.cos(x);
			this.y = Math.sin(x);
		}
		else {
			this.x = x;
			this.y = y;
		}

		return this;
	}
	/**
	 * @memberof vec
	 * @description Adds `vec2` to `this`, returning a new vector
	 * @param {vec} vec2 
	 * @returns {vec} New vector
	 */
	add(vec2) {
		if (typeof vec2 === "number") {
			return new vec(this.x + vec2, this.y + vec2);
		}
		else {
			return new vec(this.x + vec2.x, this.y + vec2.y);
		}
	}
	/**
	 * @memberof vec
	 * @description Subtracts `vec2` from `this`, returning a new vector
	 * @param {vec} vec2 
	 * @returns {vec} New vector
	 */
	sub(vec2) {
		if (typeof vec2 === "number") {
			return new vec(this.x - vec2, this.y - vec2);
		}
		else {
			return new vec(this.x - vec2.x, this.y - vec2.y);
		}
	}
	/**
	 * @memberof vec
	 * @description Multiplies `this` by `vec2`, returning a new vector
	 * @param {vec} vec2 
	 * @returns {vec} New vector
	 */
	mult(vec2) {
		if (typeof vec2 === "number") {
			return new vec(this.x * vec2, this.y * vec2);
		}
		else {
			return new vec(this.x * vec2.x, this.y * vec2.y);
		}
	}
	/**
	 * @memberof vec
	 * @description Divides `this` by `vec2`, returning a new vector
	 * @param {vec} vec2 
	 * @returns {vec} New vector
	 */
	div(vec2) {
		if (typeof vec2 === "number") {
			return new vec(this.x / vec2, this.y / vec2);
		}
		else {
			return new vec(this.x / vec2.x, this.y / vec2.y);
		}
	}
	/**
	 * @memberof vec
	 * @description Adds `vec2` to `this` in place, returning `this`
	 * @param {vec} vec2 
	 * @returns {vec} `this`
	 */
	add2(vec2) {
		if (typeof vec2 === "number") {
			this.x += vec2;
			this.y += vec2;
			return this;
		}
		else {
			this.x += vec2.x;
			this.y += vec2.y;
			return this;
		}
	}
	/**
	 * @memberof vec
	 * @description Subtracts `vec2` from `this` in place, returning `this`
	 * @param {vec} vec2 
	 * @returns {vec} `this`
	 */
	sub2(vec2) {
		if (typeof vec2 === "number") {
			this.x -= vec2;
			this.y -= vec2;
			return this;
		}
		else {
			this.x -= vec2.x;
			this.y -= vec2.y;
			return this;
		}
	}
	/**
	 * @memberof vec
	 * @description Multiplies `this` by `vec2` in place, returning `this`
	 * @param {vec} vec2 
	 * @returns {vec} `this`
	 */
	mult2(vec2) {
		if (typeof vec2 === "number") {
			this.x *= vec2;
			this.y *= vec2;
			return this;
		}
		else {
			this.x *= vec2.x;
			this.y *= vec2.y;
			return this;
		}
	}
	/**
	 * @memberof vec
	 * @description Divides `this` by `vec2` in place, returning `this`
	 * @param {vec} vec2 
	 * @returns {vec} `this`
	 */
	div2(vec2) {
		if (typeof vec2 === "number") {
			this.x /= vec2;
			this.y /= vec2;
			return this;
		}
		else {
			this.x /= vec2.x;
			this.y /= vec2.y;
			return this;
		}
	}
	/**
	 * @memberof vec
	 * @description Raises `this` to the power of `vec2`
	 * @param {vec} vec2 
	 * @returns {vec} New vector
	 */
	pow(vec2) {
		if (typeof vec2 === "number") {
			return new vec(this.x ** vec2, this.y ** vec2);
		}
		else {
			return new vec(this.x ** vec2.x, this.y ** vec2.y);
		}
	}
	/**
	 * @memberof vec
	 * @description Raises `this` to the power of `vec2` in place
	 * @param {vec} vec2 
	 * @returns {vec} `this`
	 */
	pow2(vec2) {
		if (typeof vec2 === "number") {
			this.x = this.x ** vec2;
			this.y = this.y ** vec2;
			return this;
		}
		else {
			this.x = this.x ** vec2.x;
			this.y = this.y ** vec2.y;
			return this;
		}
	}
	/**
	 * @memberof vec
	 * @description Finds the signed values of `x` and `y`
	 * @example
	 * let signed = new vec(4, -2).sign(); // signed = { x: 1, y: -1 }
	 * @returns {vec} New vector
	 */
	sign() {
		return new vec(Math.sign(this.x), Math.sign(this.y));
	}
	/**
	 * @memberof vec
	 * @description Finds the signed values of `x` and `y` in place
	 * @example
	 * let signed = new vec(0, -4);
	 * signed.sign2(); // signed = { x: 0, y: -1 }
	 * @returns {vec} `this`
	 */
	sign2() {
		this.x = Math.sign(this.x);
		this.y = Math.sign(this.y);
		return this;
	}
	/**
	 * @memberof vec
	 * @description Finds the modulus of `this` and `vec2`
	 * @param {vec} vec2 
	 * @example
	 * let mod = new vec(14, 4).mod(new vec(2, 3)); // mod = { x: 0, y: 1 }
	 * @returns {vec} New vector
	 */
	mod(vec2) {
		if (typeof vec2 === "number")
			return new vec(this.x % vec2, this.y % vec2);
		return new vec(this.x % vec2.x, this.y % vec2.y);
	}
	/**
	 * @memberof vec
	 * @description Finds the modulus of `this` and `vec2` in place
	 * @param {vec} vec2 
	 * @example
	 * let mod = new vec(-2, 6);
	 * mod.mod2(new vec(3, 4)); // mod = { x: -2, y: 2 }
	 * @returns {vec} `this`
	 */
	mod2(vec2) {
		if (typeof vec2 === "number") {
			this.x %= vec2;
			this.y %= vec2;
		}
		else {
			this.x %= vec2.x;
			this.y %= vec2.y;
		}
		return this;
	}
	/**
	 * @memberof vec
	 * @description Finds dot product of `this` and `vec2`
	 * @param {vec} vec2 
	 * @returns {vec} New vector
	 */
	dot(vec2) {
		return this.x * vec2.x + this.y * vec2.y;
	}
	/**
	 * @memberof vec
	 * @description Finds 2d cross product of `this` and `vec2`
	 * @param {vec} vec2 
	 * @returns {vec} New vector
	 */
	cross(vec2) {
		if (typeof vec2 === "number") {
			return new vec(-vec2 * this.y, vec2 * this.x);
		}
		else {
			return this.x * vec2.y - this.y * vec2.x;
		}
	}
	/**
	 * @memberof vec
	 * @description Finds average of `this` and `vec2`
	 * @param {vec} vec2 
	 * @param {weight} - The weight that `this` has in the average
	 * @returns {vec} New vector
	 */
	avg(vec2, weight = 0.5) {
		let weight2 = 1 - weight;
		return new vec(this.x * weight + vec2.x * weight2, this.y * weight + vec2.y * weight2);
	}
	/**
	 * @memberof vec
	 * @description Finds the length of `this`
	 * @returns {Number} Length
	 */
	get length() {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}
	/**
	 * @memberof vec
	 * @description Sets the length of `this`, keeping its direction the same
	 * @param {len} - The new length
	 * @example
	 * let v = new vec(1, 1);
	 * v.length = 10; // v = { x: 7.07, y: 7.07 }
	 * @returns {vec} `this`
	 */
	set length(len) {
		let scale = len / this.length;
		this.x *= scale;
		this.y *= scale;

		return this;
	}
	/**
	 * @memberof vec
	 * @description Finds the angle of `this`
	 * @returns {Number} Angle, in radians
	 */
	get angle() {
		return Math.atan2(this.y, this.x);
	}
	/**
	 * @memberof vec
	 * @description Finds area of the rectangle created by `this`
	 * @returns {Number} Area
	 */
	get area() {
		return this.x * this.y;
	}
	/**
	 * @memberof vec
	 * @description Finds the manhattan distance (x + y) between `vec` and `this`
	 * @param {vec} vec2
	 * @returns {Number} Distnace
	 */
	manhattan(vec2) {
		return Math.abs(vec2.x - this.x) + Math.abs(vec2.y - this.y);
	}
	/**
	 * @memberof vec
	 * @description Takes the absolute value of `x` and `y`
	 * @returns {vec} New vector
	 */
	abs() {
		return new vec(Math.abs(this.x), Math.abs(this.y));
	}
	/**
	 * @memberof vec
	 * @description Takes the absolute value of `x` and `y` in place
	 * @returns {vec} `this`
	 */
	abs2() {
		this.x = Math.abs(this.x);
		this.y = Math.abs(this.y);
		return this;
	}
	/**
	 * @memberof vec
	 * @description Reflects `this` over `vec2`. `vec2` must be normalized
	 * @param {vec} vec2 - Normalized vector reflected across
	 * @returns {vec} New reflected vector
	 */
	reflect(vec2) { // vec2 must be normalized
		// Vect2 = Vect1 - 2 * WallN * (WallN DOT Vect1)
		let v2 = vec2.normal();
		return this.sub(v2.mult(v2.dot(this) * 2));
	}
	/**
	 * @memberof vec
	 * @description Reflects `this` over `vec2` in place. `vec2` must be normalized
	 * @param {vec} vec2 - Normalized vector reflected across
	 * @returns {vec} `this`
	 */
	reflect2(vec2) { // vec2 must be normalized
		let v2 = vec2.normal();
		return this.sub2(v2.mult(v2.dot(this) * 2));
	}
	/**
	 * @memberof vec
	 * @description Rotates `this` by `angle`
	 * @param {Number} angle - Angle rotated by, in radians
	 * @returns {vec} New rotated vector
	 */
	rotate(angle) {
		return new vec(Math.cos(angle) * this.x - Math.sin(angle) * this.y, Math.sin(angle) * this.x + Math.cos(angle) * this.y);
	}
	/**
	 * @memberof vec
	 * @description Rotates `this` by `angle` in place
	 * @param {Number} angle - Angle rotated by, in radians
	 * @returns {vec} `this`
	 */
	rotate2(angle) {
		let x = Math.cos(angle) * this.x - Math.sin(angle) * this.y;
		this.y = Math.sin(angle) * this.x + Math.cos(angle) * this.y;
		this.x = x;
		return this;
	}
	/**
	 * @memberof vec
	 * @description Projects `this` onto `vec2`
	 * @param {vec} vec2 - Vector projected onto
	 * @param {Boolean} [bound=false] - If the projected vector should be forced between the bounds of `vec2`
	 * @returns {vec} New rotated vector
	 */
	project(vec2, bound = false) { // projects this vector onto the other one
		let d1 = this.dot(vec2);
		let d2 = vec2.x * vec2.x + vec2.y * vec2.y;

		if (bound) {
			d1 = Math.max(0, Math.min(d2, d1));
		}

		return new vec(d1 * vec2.x / d2, d1 * vec2.y / d2);
	}
	/**
	 * @memberof vec
	 * @description Projects `this` onto `vec2` in place
	 * @param {vec} vec2 - Vector projected onto
	 * @param {Boolean} [bound=false] - If the projected vector should be forced between the bounds of `vec2`
	 * @returns {vec} `this`
	 */
	project2(vec2, bound = false) { // projects this vector onto the other one
		let d1 = this.dot(vec2);
		let d2 = vec2.x * vec2.x + vec2.y * vec2.y;

		if (bound) {
			d1 = Math.max(0, Math.min(d2, d1));
		}

		this.x = d1 * vec2.x / d2;
		this.y = d1 * vec2.y / d2;

		return this;
	}
	/**
	 * @memberof vec
	 * @description Normalizes `this`, making its length 1
	 * @returns {vec} New vector
	 */
	normalize() {
		let len = this.length;
		if (len === 0) return new vec(this);
		return new vec(this.x / len, this.y / len);
	}
	/**
	 * @memberof vec
	 * @description Normalizes `this` in place, making its length 1
	 * @returns {vec} `this`
	 */
	normalize2() {
		let len = this.length;
		if (len === 0) return this;
		this.x /= len;
		this.y /= len;
		return this;
	}
	/**
	 * @memberof vec
	 * @description Finds the left hand normal
	 * @returns {vec} New vector
	 */
	normal() { // left hand normal
		return new vec(this.y, -this.x);
	}
	/**
	 * @memberof vec
	 * @description Finds the left hand normal in place
	 * @returns {vec} `this`
	 */
	normal2() { // left hand normal
		let y = this.y;
		this.y = -this.x;
		this.x = y;
		return this;
	}
	/**
	 * @memberof vec
	 * @description Rounds `x` and `y` components down
	 * @returns {vec} New vector
	 */
	floor() {
		return new vec(Math.floor(this.x), Math.floor(this.y));
	}
	/**
	 * @memberof vec
	 * @description Rounds `x` and `y` components down in place
	 * @returns {vec} `this`
	 */
	floor2() {
		this.x = Math.floor(this.x);
		this.y = Math.floor(this.y);
		return this;
	}
	/**
	 * @memberof vec
	 * @description Rounds `x` and `y` components up
	 * @returns {vec} New vector
	 */
	ceil() {
		return new vec(Math.ceil(this.x), Math.ceil(this.y));
	}
	/**
	 * @memberof vec
	 * @description Rounds `x` and `y` components up in place
	 * @returns {vec} `this`
	 */
	ceil2() {
		this.x = Math.ceil(this.x);
		this.y = Math.ceil(this.y);
		return this;
	}
	/**
	 * @memberof vec
	 * @description Rounds `x` and `y` components
	 * @returns {vec} New vector
	 */
	round() {
		return new vec(Math.round(this.x), Math.round(this.y));
	}
	/**
	 * @memberof vec
	 * @description Rounds `x` and `y` components in place
	 * @returns {vec} `this`
	 */
	round2() {
		this.x = Math.round(this.x);
		this.y = Math.round(this.y);
		return this;
	}
	/**
	 * @memberof vec
	 * @description Finds  the minimum `x` and `y` components between `this` and `vec2`
	 * @param {vec} vec2
	 * @returns {vec} New vector
	 */
	min(vec2) {
		return new vec(Math.min(vec2.x, this.x), Math.min(vec2.y, this.y));
	}
	/**
	 * @memberof vec
	 * @description Finds  the minimum `x` and `y` components between `this` and `vec2` in place
	 * @param {vec} vec2
	 * @returns {vec} `this`
	 */
	min2(vec2) {
		this.x = Math.min(this.x, vec2.x);
		this.y = Math.min(this.y, vec2.y);
		return this;
	}
	/**
	 * @memberof vec
	 * @description Finds the maximum `x` and `y` components between `this` and `vec2`
	 * @param {vec} vec2
	 * @returns {vec} New vector
	 */
	max(vec2) {
		return new vec(Math.max(vec2.x, this.x), Math.max(vec2.y, this.y));
	}
	/**
	 * @memberof vec
	 * @description Finds the maximum `x` and `y` components between `this` and `vec2` in place
	 * @param {vec} vec2
	 * @returns {vec} `this`
	 */
	max2(vec2) {
		this.x = Math.max(this.x, vec2.x);
		this.y = Math.max(this.y, vec2.y);
		return this;
	}
	/**
	 * @memberof vec
	 * @description Clamps `x` and `y` components between `min` and `max`
	 * @param {vec} min
	 * @param {vec} max
	 * @returns {vec} New vector
	 */
	clamp(min, max) {
		return new vec(Math.max(min.x, Math.min(max.x, this.x)), Math.max(min.y, Math.min(max.y, this.y)));
	}
	/**
	 * @memberof vec
	 * @description Finds  the maximum `x` and `y` components between `this` and `vec2` in place
	 * @param {vec} min
	 * @param {vec} max
	 * @returns {vec} `this`
	 */
	clamp2(min, max) {
		this.x = Math.max(min.x, Math.min(max.x, this.x));
		this.y = Math.max(min.y, Math.min(max.y, this.y));
		return this;
	}
	/**
	 * @memberof vec
	 * @description Checks if `this` equals `vec2`. DOES NOT take into account floating point error.
	 * @param {vec} vec2
	 * @returns {Boolean}
	 */
	equals(vec2) {
		return this.x === vec2.x && this.y === vec2.y;
	}
	/**
	 * @memberof vec
	 * @description Sets the `x` and `y` components to be the same as `vec2` in place
	 * @param {vec} vec2
	 * @returns {vec} `this`
	 */
	set(vec2) {
		this.x = vec2.x;
		this.y = vec2.y;
		return this;
	}
	/**
	 * @memberof vec
	 * @description Creates a string in the format `"{ x : x, y: y }"`
	 * @returns {void}
	 */
	toString() {
		return `{ x: ${ this.x }, y: ${ this.y } }`;
	}
	/**
	 * @memberof vec
	 * @description Creates a string in the format `"{ x : x, y: y }"`, with `x` and `y` rounded
	 * @returns {void}
	 */
	toStringInt() {
		return `{ x: ${ Math.round(this.x) }, y: ${ Math.round(this.y) } }`;
	}
	/**
	 * @memberof vec
	 * @description Creates js object in the form of `{ x: x, y: y }`
	 * @returns {Object}
	 */
	toObject() {
		return { x: this.x, y: this.y };
	}
	/**
	 * @memberof vec
	 * @description Creates a array in the format `[x, y]`
	 * @returns {void}
	 */
	toArray() {
		return [this.x, this.y];
	}
	/**
	 * @memberof vec
	 * @description Finds if any part of the vector is NaN
	 * @returns {Boolean}
	 */
	isNaN() {
		return isNaN(this.x) || isNaN(this.y);
	}
}


/***/ }),

/***/ "./src/lib/poly-decomp.js":
/*!********************************!*\
  !*** ./src/lib/poly-decomp.js ***!
  \********************************/
/***/ ((module) => {

/*
The MIT License (MIT)

Copyright (c) 2013 Stefan Hedman

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

module.exports = {
    decomp: polygonDecomp,
    quickDecomp: polygonQuickDecomp,
    isSimple: polygonIsSimple,
    removeCollinearPoints: polygonRemoveCollinearPoints,
    removeDuplicatePoints: polygonRemoveDuplicatePoints,
    makeCCW: polygonMakeCCW
};

function lineInt(l1,l2,precision){
    precision = precision || 0;
    var i = [0,0]; // point
    var a1, b1, c1, a2, b2, c2, det; // scalars
    a1 = l1[1][1] - l1[0][1];
    b1 = l1[0][0] - l1[1][0];
    c1 = a1 * l1[0][0] + b1 * l1[0][1];
    a2 = l2[1][1] - l2[0][1];
    b2 = l2[0][0] - l2[1][0];
    c2 = a2 * l2[0][0] + b2 * l2[0][1];
    det = a1 * b2 - a2*b1;
    if (!scalar_eq(det, 0, precision)) { // lines are not parallel
        i[0] = (b2 * c1 - b1 * c2) / det;
        i[1] = (a1 * c2 - a2 * c1) / det;
    }
    return i;
}

function lineSegmentsIntersect(p1, p2, q1, q2){
	var dx = p2[0] - p1[0];
	var dy = p2[1] - p1[1];
	var da = q2[0] - q1[0];
	var db = q2[1] - q1[1];

	// segments are parallel
	if((da*dy - db*dx) === 0){
		return false;
	}

	var s = (dx * (q1[1] - p1[1]) + dy * (p1[0] - q1[0])) / (da * dy - db * dx);
	var t = (da * (p1[1] - q1[1]) + db * (q1[0] - p1[0])) / (db * dx - da * dy);

	return (s>=0 && s<=1 && t>=0 && t<=1);
}

function triangleArea(a,b,c){
    return (((b[0] - a[0])*(c[1] - a[1]))-((c[0] - a[0])*(b[1] - a[1])));
}

function isLeft(a,b,c){
    return triangleArea(a,b,c) > 0;
}

function isLeftOn(a,b,c) {
    return triangleArea(a, b, c) >= 0;
}

function isRight(a,b,c) {
    return triangleArea(a, b, c) < 0;
}

function isRightOn(a,b,c) {
    return triangleArea(a, b, c) <= 0;
}

var tmpPoint1 = [],
    tmpPoint2 = [];

function collinear(a,b,c,thresholdAngle) {
    if(!thresholdAngle){
        return triangleArea(a, b, c) === 0;
    } else {
        var ab = tmpPoint1,
            bc = tmpPoint2;

        ab[0] = b[0]-a[0];
        ab[1] = b[1]-a[1];
        bc[0] = c[0]-b[0];
        bc[1] = c[1]-b[1];

        var dot = ab[0]*bc[0] + ab[1]*bc[1],
            magA = Math.sqrt(ab[0]*ab[0] + ab[1]*ab[1]),
            magB = Math.sqrt(bc[0]*bc[0] + bc[1]*bc[1]),
            angle = Math.acos(dot/(magA*magB));
        return angle < thresholdAngle;
    }
}

function sqdist(a,b){
    var dx = b[0] - a[0];
    var dy = b[1] - a[1];
    return dx * dx + dy * dy;
}

function polygonAt(polygon, i){
    var s = polygon.length;
    return polygon[i < 0 ? i % s + s : i % s];
}

function polygonClear(polygon){
    polygon.length = 0;
}

function polygonAppend(polygon, poly, from, to){
    for(var i=from; i<to; i++){
        polygon.push(poly[i]);
    }
}

function polygonMakeCCW(polygon){
    var br = 0,
        v = polygon;

    // find bottom right point
    for (var i = 1; i < polygon.length; ++i) {
        if (v[i][1] < v[br][1] || (v[i][1] === v[br][1] && v[i][0] > v[br][0])) {
            br = i;
        }
    }

    // reverse poly if clockwise
    if (!isLeft(polygonAt(polygon, br - 1), polygonAt(polygon, br), polygonAt(polygon, br + 1))) {
        polygonReverse(polygon);
        return true;
    } else {
        return false;
    }
}

function polygonReverse(polygon){
    var tmp = [];
    var N = polygon.length;
    for(var i=0; i!==N; i++){
        tmp.push(polygon.pop());
    }
    for(var i=0; i!==N; i++){
		polygon[i] = tmp[i];
    }
}

function polygonIsReflex(polygon, i){
    return isRight(polygonAt(polygon, i - 1), polygonAt(polygon, i), polygonAt(polygon, i + 1));
}

var tmpLine1=[],
    tmpLine2=[];

function polygonCanSee(polygon, a,b) {
    var p, dist, l1=tmpLine1, l2=tmpLine2;

    if (isLeftOn(polygonAt(polygon, a + 1), polygonAt(polygon, a), polygonAt(polygon, b)) && isRightOn(polygonAt(polygon, a - 1), polygonAt(polygon, a), polygonAt(polygon, b))) {
        return false;
    }
    dist = sqdist(polygonAt(polygon, a), polygonAt(polygon, b));
    for (var i = 0; i !== polygon.length; ++i) { // for each edge
        if ((i + 1) % polygon.length === a || i === a){ // ignore incident edges
            continue;
        }
        if (isLeftOn(polygonAt(polygon, a), polygonAt(polygon, b), polygonAt(polygon, i + 1)) && isRightOn(polygonAt(polygon, a), polygonAt(polygon, b), polygonAt(polygon, i))) { // if diag intersects an edge
            l1[0] = polygonAt(polygon, a);
            l1[1] = polygonAt(polygon, b);
            l2[0] = polygonAt(polygon, i);
            l2[1] = polygonAt(polygon, i + 1);
            p = lineInt(l1,l2);
            if (sqdist(polygonAt(polygon, a), p) < dist) { // if edge is blocking visibility to b
                return false;
            }
        }
    }

    return true;
}

function polygonCanSee2(polygon, a,b) {
    // for each edge
    for (var i = 0; i !== polygon.length; ++i) {
        // ignore incident edges
        if (i === a || i === b || (i + 1) % polygon.length === a || (i + 1) % polygon.length === b){
            continue;
        }
        if( lineSegmentsIntersect(polygonAt(polygon, a), polygonAt(polygon, b), polygonAt(polygon, i), polygonAt(polygon, i+1)) ){
            return false;
        }
    }
    return true;
}

function polygonCopy(polygon, i,j,targetPoly){
    var p = targetPoly || [];
    polygonClear(p);
    if (i < j) {
        // Insert all vertices from i to j
        for(var k=i; k<=j; k++){
            p.push(polygon[k]);
        }

    } else {

        // Insert vertices 0 to j
        for(var k=0; k<=j; k++){
            p.push(polygon[k]);
        }

        // Insert vertices i to end
        for(var k=i; k<polygon.length; k++){
            p.push(polygon[k]);
        }
    }

    return p;
}

function polygonGetCutEdges(polygon) {
    var min=[], tmp1=[], tmp2=[], tmpPoly = [];
    var nDiags = Number.MAX_VALUE;

    for (var i = 0; i < polygon.length; ++i) {
        if (polygonIsReflex(polygon, i)) {
            for (var j = 0; j < polygon.length; ++j) {
                if (polygonCanSee(polygon, i, j)) {
                    tmp1 = polygonGetCutEdges(polygonCopy(polygon, i, j, tmpPoly));
                    tmp2 = polygonGetCutEdges(polygonCopy(polygon, j, i, tmpPoly));

                    for(var k=0; k<tmp2.length; k++){
                        tmp1.push(tmp2[k]);
                    }

                    if (tmp1.length < nDiags) {
                        min = tmp1;
                        nDiags = tmp1.length;
                        min.push([polygonAt(polygon, i), polygonAt(polygon, j)]);
                    }
                }
            }
        }
    }

    return min;
}

function polygonDecomp(polygon){
    var edges = polygonGetCutEdges(polygon);
    if(edges.length > 0){
        return polygonSlice(polygon, edges);
    } else {
        return [polygon];
    }
}

function polygonSlice(polygon, cutEdges){
    if(cutEdges.length === 0){
		return [polygon];
    }
    if(cutEdges instanceof Array && cutEdges.length && cutEdges[0] instanceof Array && cutEdges[0].length===2 && cutEdges[0][0] instanceof Array){

        var polys = [polygon];

        for(var i=0; i<cutEdges.length; i++){
            var cutEdge = cutEdges[i];
            // Cut all polys
            for(var j=0; j<polys.length; j++){
                var poly = polys[j];
                var result = polygonSlice(poly, cutEdge);
                if(result){
                    // Found poly! Cut and quit
                    polys.splice(j,1);
                    polys.push(result[0],result[1]);
                    break;
                }
            }
        }

        return polys;
    } else {

        // Was given one edge
        var cutEdge = cutEdges;
        var i = polygon.indexOf(cutEdge[0]);
        var j = polygon.indexOf(cutEdge[1]);

        if(i !== -1 && j !== -1){
            return [polygonCopy(polygon, i,j),
                    polygonCopy(polygon, j,i)];
        } else {
            return false;
        }
    }
}

function polygonIsSimple(polygon){
    var path = polygon, i;
    // Check
    for(i=0; i<path.length-1; i++){
        for(var j=0; j<i-1; j++){
            if(lineSegmentsIntersect(path[i], path[i+1], path[j], path[j+1] )){
                return false;
            }
        }
    }

    // Check the segment between the last and the first point to all others
    for(i=1; i<path.length-2; i++){
        if(lineSegmentsIntersect(path[0], path[path.length-1], path[i], path[i+1] )){
            return false;
        }
    }

    return true;
}

function getIntersectionPoint(p1, p2, q1, q2, delta){
	delta = delta || 0;
	var a1 = p2[1] - p1[1];
	var b1 = p1[0] - p2[0];
	var c1 = (a1 * p1[0]) + (b1 * p1[1]);
	var a2 = q2[1] - q1[1];
	var b2 = q1[0] - q2[0];
	var c2 = (a2 * q1[0]) + (b2 * q1[1]);
	var det = (a1 * b2) - (a2 * b1);

	if(!scalar_eq(det,0,delta)){
		return [((b2 * c1) - (b1 * c2)) / det, ((a1 * c2) - (a2 * c1)) / det];
	} else {
		return [0,0];
    }
}

function polygonQuickDecomp(polygon, result,reflexVertices,steinerPoints,delta,maxlevel,level){
    maxlevel = maxlevel || 100;
    level = level || 0;
    delta = delta || 25;
    result = typeof(result)!=="undefined" ? result : [];
    reflexVertices = reflexVertices || [];
    steinerPoints = steinerPoints || [];

    var upperInt=[0,0], lowerInt=[0,0], p=[0,0]; // Points
    var upperDist=0, lowerDist=0, d=0, closestDist=0; // scalars
    var upperIndex=0, lowerIndex=0, closestIndex=0; // Integers
    var lowerPoly=[], upperPoly=[]; // polygons
    var poly = polygon,
        v = polygon;

    if(v.length < 3){
		return result;
    }

    level++;
    if(level > maxlevel){
        console.warn("quickDecomp: max level ("+maxlevel+") reached.");
        return result;
    }

    for (var i = 0; i < polygon.length; ++i) {
        if (polygonIsReflex(poly, i)) {
            reflexVertices.push(poly[i]);
            upperDist = lowerDist = Number.MAX_VALUE;


            for (var j = 0; j < polygon.length; ++j) {
                if (isLeft(polygonAt(poly, i - 1), polygonAt(poly, i), polygonAt(poly, j)) && isRightOn(polygonAt(poly, i - 1), polygonAt(poly, i), polygonAt(poly, j - 1))) { // if line intersects with an edge
                    p = getIntersectionPoint(polygonAt(poly, i - 1), polygonAt(poly, i), polygonAt(poly, j), polygonAt(poly, j - 1)); // find the point of intersection
                    if (isRight(polygonAt(poly, i + 1), polygonAt(poly, i), p)) { // make sure it's inside the poly
                        d = sqdist(poly[i], p);
                        if (d < lowerDist) { // keep only the closest intersection
                            lowerDist = d;
                            lowerInt = p;
                            lowerIndex = j;
                        }
                    }
                }
                if (isLeft(polygonAt(poly, i + 1), polygonAt(poly, i), polygonAt(poly, j + 1)) && isRightOn(polygonAt(poly, i + 1), polygonAt(poly, i), polygonAt(poly, j))) {
                    p = getIntersectionPoint(polygonAt(poly, i + 1), polygonAt(poly, i), polygonAt(poly, j), polygonAt(poly, j + 1));
                    if (isLeft(polygonAt(poly, i - 1), polygonAt(poly, i), p)) {
                        d = sqdist(poly[i], p);
                        if (d < upperDist) {
                            upperDist = d;
                            upperInt = p;
                            upperIndex = j;
                        }
                    }
                }
            }

            // if there are no vertices to connect to, choose a point in the middle
            if (lowerIndex === (upperIndex + 1) % polygon.length) {
                //console.log("Case 1: Vertex("+i+"), lowerIndex("+lowerIndex+"), upperIndex("+upperIndex+"), poly.size("+polygon.length+")");
                p[0] = (lowerInt[0] + upperInt[0]) / 2;
                p[1] = (lowerInt[1] + upperInt[1]) / 2;
                steinerPoints.push(p);

                if (i < upperIndex) {
                    //lowerPoly.insert(lowerPoly.end(), poly.begin() + i, poly.begin() + upperIndex + 1);
                    polygonAppend(lowerPoly, poly, i, upperIndex+1);
                    lowerPoly.push(p);
                    upperPoly.push(p);
                    if (lowerIndex !== 0){
                        //upperPoly.insert(upperPoly.end(), poly.begin() + lowerIndex, poly.end());
                        polygonAppend(upperPoly, poly,lowerIndex,poly.length);
                    }
                    //upperPoly.insert(upperPoly.end(), poly.begin(), poly.begin() + i + 1);
                    polygonAppend(upperPoly, poly,0,i+1);
                } else {
                    if (i !== 0){
                        //lowerPoly.insert(lowerPoly.end(), poly.begin() + i, poly.end());
                        polygonAppend(lowerPoly, poly,i,poly.length);
                    }
                    //lowerPoly.insert(lowerPoly.end(), poly.begin(), poly.begin() + upperIndex + 1);
                    polygonAppend(lowerPoly, poly,0,upperIndex+1);
                    lowerPoly.push(p);
                    upperPoly.push(p);
                    //upperPoly.insert(upperPoly.end(), poly.begin() + lowerIndex, poly.begin() + i + 1);
                    polygonAppend(upperPoly, poly,lowerIndex,i+1);
                }
            } else {
                // connect to the closest point within the triangle
                //console.log("Case 2: Vertex("+i+"), closestIndex("+closestIndex+"), poly.size("+polygon.length+")\n");

                if (lowerIndex > upperIndex) {
                    upperIndex += polygon.length;
                }
                closestDist = Number.MAX_VALUE;

                if(upperIndex < lowerIndex){
                    return result;
                }

                for (var j = lowerIndex; j <= upperIndex; ++j) {
                    if (
                        isLeftOn(polygonAt(poly, i - 1), polygonAt(poly, i), polygonAt(poly, j)) &&
                        isRightOn(polygonAt(poly, i + 1), polygonAt(poly, i), polygonAt(poly, j))
                    ) {
                        d = sqdist(polygonAt(poly, i), polygonAt(poly, j));
                        if (d < closestDist && polygonCanSee2(poly, i, j)) {
                            closestDist = d;
                            closestIndex = j % polygon.length;
                        }
                    }
                }

                if (i < closestIndex) {
                    polygonAppend(lowerPoly, poly,i,closestIndex+1);
                    if (closestIndex !== 0){
                        polygonAppend(upperPoly, poly,closestIndex,v.length);
                    }
                    polygonAppend(upperPoly, poly,0,i+1);
                } else {
                    if (i !== 0){
                        polygonAppend(lowerPoly, poly,i,v.length);
                    }
                    polygonAppend(lowerPoly, poly,0,closestIndex+1);
                    polygonAppend(upperPoly, poly,closestIndex,i+1);
                }
            }

            // solve smallest poly first
            if (lowerPoly.length < upperPoly.length) {
                polygonQuickDecomp(lowerPoly,result,reflexVertices,steinerPoints,delta,maxlevel,level);
                polygonQuickDecomp(upperPoly,result,reflexVertices,steinerPoints,delta,maxlevel,level);
            } else {
                polygonQuickDecomp(upperPoly,result,reflexVertices,steinerPoints,delta,maxlevel,level);
                polygonQuickDecomp(lowerPoly,result,reflexVertices,steinerPoints,delta,maxlevel,level);
            }

            return result;
        }
    }
    result.push(polygon);

    return result;
}

function polygonRemoveCollinearPoints(polygon, precision){
    var num = 0;
    for(var i=polygon.length-1; polygon.length>3 && i>=0; --i){
        if(collinear(polygonAt(polygon, i-1),polygonAt(polygon, i),polygonAt(polygon, i+1),precision)){
            // Remove the middle point
            polygon.splice(i%polygon.length,1);
            num++;
        }
    }
    return num;
}

function polygonRemoveDuplicatePoints(polygon, precision){
    for(var i=polygon.length-1; i>=1; --i){
        var pi = polygon[i];
        for(var j=i-1; j>=0; --j){
            if(points_eq(pi, polygon[j], precision)){
                polygon.splice(i,1);
                continue;
            }
        }
    }
}

function scalar_eq(a,b,precision){
    precision = precision || 0;
    return Math.abs(a-b) <= precision;
}

function points_eq(a,b,precision){
    return scalar_eq(a[0],b[0],precision) && scalar_eq(a[1],b[1],precision);
}


/***/ }),

/***/ "./src/lib/simplexNoise.js":
/*!*********************************!*\
  !*** ./src/lib/simplexNoise.js ***!
  \*********************************/
/***/ (function() {

/*
 * https://github.com/josephg/noisejs
 * A speed-improved perlin and simplex noise algorithms for 2D.
 *
 * Based on example code by Stefan Gustavson (stegu@itn.liu.se).
 * Optimisations by Peter Eastman (peastman@drizzle.stanford.edu).
 * Better rank ordering method by Stefan Gustavson in 2012.
 * Converted to Javascript by Joseph Gentle.
 *
 * Version 2012-03-09
 *
 * This code was placed in the public domain by its original author,
 * Stefan Gustavson. You may use it as you see fit, but
 * attribution is appreciated.
 *
 */

(function(global){
	var module = global.noise = {};
  
	function Grad(x, y, z) {
	  this.x = x; this.y = y; this.z = z;
	}
	
	Grad.prototype.dot2 = function(x, y) {
	  return this.x*x + this.y*y;
	};
  
	Grad.prototype.dot3 = function(x, y, z) {
	  return this.x*x + this.y*y + this.z*z;
	};
  
	var grad3 = [new Grad(1,1,0),new Grad(-1,1,0),new Grad(1,-1,0),new Grad(-1,-1,0),
				 new Grad(1,0,1),new Grad(-1,0,1),new Grad(1,0,-1),new Grad(-1,0,-1),
				 new Grad(0,1,1),new Grad(0,-1,1),new Grad(0,1,-1),new Grad(0,-1,-1)];
  
	var p = [151,160,137,91,90,15,
	131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
	190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,
	88,237,149,56,87,174,20,125,136,171,168, 68,175,74,165,71,134,139,48,27,166,
	77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,
	102,143,54, 65,25,63,161, 1,216,80,73,209,76,132,187,208, 89,18,169,200,196,
	135,130,116,188,159,86,164,100,109,198,173,186, 3,64,52,217,226,250,124,123,
	5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,
	223,183,170,213,119,248,152, 2,44,154,163, 70,221,153,101,155,167, 43,172,9,
	129,22,39,253, 19,98,108,110,79,113,224,232,178,185, 112,104,218,246,97,228,
	251,34,242,193,238,210,144,12,191,179,162,241, 81,51,145,235,249,14,239,107,
	49,192,214, 31,181,199,106,157,184, 84,204,176,115,121,50,45,127, 4,150,254,
	138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
	// To remove the need for index wrapping, double the permutation table length
	var perm = new Array(512);
	var gradP = new Array(512);
  
	// This isn't a very good seeding function, but it works ok. It supports 2^16
	// different seed values. Write something better if you need more seeds.
	module.seed = function(seed) {
	  if(seed > 0 && seed < 1) {
		// Scale the seed out
		seed *= 65536;
	  }
  
	  seed = Math.floor(seed);
	  if(seed < 256) {
		seed |= seed << 8;
	  }
  
	  for(var i = 0; i < 256; i++) {
		var v;
		if (i & 1) {
		  v = p[i] ^ (seed & 255);
		} else {
		  v = p[i] ^ ((seed>>8) & 255);
		}
  
		perm[i] = perm[i + 256] = v;
		gradP[i] = gradP[i + 256] = grad3[v % 12];
	  }
	};
  
	module.seed(0);
  
	/*
	for(var i=0; i<256; i++) {
	  perm[i] = perm[i + 256] = p[i];
	  gradP[i] = gradP[i + 256] = grad3[perm[i] % 12];
	}*/
  
	// Skewing and unskewing factors for 2, 3, and 4 dimensions
	var F2 = 0.5*(Math.sqrt(3)-1);
	var G2 = (3-Math.sqrt(3))/6;
  
	var F3 = 1/3;
	var G3 = 1/6;
  
	// 2D simplex noise
	module.simplex2 = function(xin, yin) {
	  var n0, n1, n2; // Noise contributions from the three corners
	  // Skew the input space to determine which simplex cell we're in
	  var s = (xin+yin)*F2; // Hairy factor for 2D
	  var i = Math.floor(xin+s);
	  var j = Math.floor(yin+s);
	  var t = (i+j)*G2;
	  var x0 = xin-i+t; // The x,y distances from the cell origin, unskewed.
	  var y0 = yin-j+t;
	  // For the 2D case, the simplex shape is an equilateral triangle.
	  // Determine which simplex we are in.
	  var i1, j1; // Offsets for second (middle) corner of simplex in (i,j) coords
	  if(x0>y0) { // lower triangle, XY order: (0,0)->(1,0)->(1,1)
		i1=1; j1=0;
	  } else {    // upper triangle, YX order: (0,0)->(0,1)->(1,1)
		i1=0; j1=1;
	  }
	  // A step of (1,0) in (i,j) means a step of (1-c,-c) in (x,y), and
	  // a step of (0,1) in (i,j) means a step of (-c,1-c) in (x,y), where
	  // c = (3-sqrt(3))/6
	  var x1 = x0 - i1 + G2; // Offsets for middle corner in (x,y) unskewed coords
	  var y1 = y0 - j1 + G2;
	  var x2 = x0 - 1 + 2 * G2; // Offsets for last corner in (x,y) unskewed coords
	  var y2 = y0 - 1 + 2 * G2;
	  // Work out the hashed gradient indices of the three simplex corners
	  i &= 255;
	  j &= 255;
	  var gi0 = gradP[i+perm[j]];
	  var gi1 = gradP[i+i1+perm[j+j1]];
	  var gi2 = gradP[i+1+perm[j+1]];
	  // Calculate the contribution from the three corners
	  var t0 = 0.5 - x0*x0-y0*y0;
	  if(t0<0) {
		n0 = 0;
	  } else {
		t0 *= t0;
		n0 = t0 * t0 * gi0.dot2(x0, y0);  // (x,y) of grad3 used for 2D gradient
	  }
	  var t1 = 0.5 - x1*x1-y1*y1;
	  if(t1<0) {
		n1 = 0;
	  } else {
		t1 *= t1;
		n1 = t1 * t1 * gi1.dot2(x1, y1);
	  }
	  var t2 = 0.5 - x2*x2-y2*y2;
	  if(t2<0) {
		n2 = 0;
	  } else {
		t2 *= t2;
		n2 = t2 * t2 * gi2.dot2(x2, y2);
	  }
	  // Add contributions from each corner to get the final noise value.
	  // The result is scaled to return values in the interval [-1,1].
	  return 70 * (n0 + n1 + n2);
	};
  
	// 3D simplex noise
	module.simplex3 = function(xin, yin, zin) {
	  var n0, n1, n2, n3; // Noise contributions from the four corners
  
	  // Skew the input space to determine which simplex cell we're in
	  var s = (xin+yin+zin)*F3; // Hairy factor for 2D
	  var i = Math.floor(xin+s);
	  var j = Math.floor(yin+s);
	  var k = Math.floor(zin+s);
  
	  var t = (i+j+k)*G3;
	  var x0 = xin-i+t; // The x,y distances from the cell origin, unskewed.
	  var y0 = yin-j+t;
	  var z0 = zin-k+t;
  
	  // For the 3D case, the simplex shape is a slightly irregular tetrahedron.
	  // Determine which simplex we are in.
	  var i1, j1, k1; // Offsets for second corner of simplex in (i,j,k) coords
	  var i2, j2, k2; // Offsets for third corner of simplex in (i,j,k) coords
	  if(x0 >= y0) {
		if(y0 >= z0)      { i1=1; j1=0; k1=0; i2=1; j2=1; k2=0; }
		else if(x0 >= z0) { i1=1; j1=0; k1=0; i2=1; j2=0; k2=1; }
		else              { i1=0; j1=0; k1=1; i2=1; j2=0; k2=1; }
	  } else {
		if(y0 < z0)      { i1=0; j1=0; k1=1; i2=0; j2=1; k2=1; }
		else if(x0 < z0) { i1=0; j1=1; k1=0; i2=0; j2=1; k2=1; }
		else             { i1=0; j1=1; k1=0; i2=1; j2=1; k2=0; }
	  }
	  // A step of (1,0,0) in (i,j,k) means a step of (1-c,-c,-c) in (x,y,z),
	  // a step of (0,1,0) in (i,j,k) means a step of (-c,1-c,-c) in (x,y,z), and
	  // a step of (0,0,1) in (i,j,k) means a step of (-c,-c,1-c) in (x,y,z), where
	  // c = 1/6.
	  var x1 = x0 - i1 + G3; // Offsets for second corner
	  var y1 = y0 - j1 + G3;
	  var z1 = z0 - k1 + G3;
  
	  var x2 = x0 - i2 + 2 * G3; // Offsets for third corner
	  var y2 = y0 - j2 + 2 * G3;
	  var z2 = z0 - k2 + 2 * G3;
  
	  var x3 = x0 - 1 + 3 * G3; // Offsets for fourth corner
	  var y3 = y0 - 1 + 3 * G3;
	  var z3 = z0 - 1 + 3 * G3;
  
	  // Work out the hashed gradient indices of the four simplex corners
	  i &= 255;
	  j &= 255;
	  k &= 255;
	  var gi0 = gradP[i+   perm[j+   perm[k   ]]];
	  var gi1 = gradP[i+i1+perm[j+j1+perm[k+k1]]];
	  var gi2 = gradP[i+i2+perm[j+j2+perm[k+k2]]];
	  var gi3 = gradP[i+ 1+perm[j+ 1+perm[k+ 1]]];
  
	  // Calculate the contribution from the four corners
	  var t0 = 0.6 - x0*x0 - y0*y0 - z0*z0;
	  if(t0<0) {
		n0 = 0;
	  } else {
		t0 *= t0;
		n0 = t0 * t0 * gi0.dot3(x0, y0, z0);  // (x,y) of grad3 used for 2D gradient
	  }
	  var t1 = 0.6 - x1*x1 - y1*y1 - z1*z1;
	  if(t1<0) {
		n1 = 0;
	  } else {
		t1 *= t1;
		n1 = t1 * t1 * gi1.dot3(x1, y1, z1);
	  }
	  var t2 = 0.6 - x2*x2 - y2*y2 - z2*z2;
	  if(t2<0) {
		n2 = 0;
	  } else {
		t2 *= t2;
		n2 = t2 * t2 * gi2.dot3(x2, y2, z2);
	  }
	  var t3 = 0.6 - x3*x3 - y3*y3 - z3*z3;
	  if(t3<0) {
		n3 = 0;
	  } else {
		t3 *= t3;
		n3 = t3 * t3 * gi3.dot3(x3, y3, z3);
	  }
	  // Add contributions from each corner to get the final noise value.
	  // The result is scaled to return values in the interval [-1,1].
	  return 32 * (n0 + n1 + n2 + n3);
  
	};
  
	// ##### Perlin noise stuff
  
	function fade(t) {
	  return t*t*t*(t*(t*6-15)+10);
	}
  
	function lerp(a, b, t) {
	  return (1-t)*a + t*b;
	}
  
	// 2D Perlin Noise
	module.perlin2 = function(x, y) {
	  // Find unit grid cell containing point
	  var X = Math.floor(x), Y = Math.floor(y);
	  // Get relative xy coordinates of point within that cell
	  x = x - X; y = y - Y;
	  // Wrap the integer cells at 255 (smaller integer period can be introduced here)
	  X = X & 255; Y = Y & 255;
  
	  // Calculate noise contributions from each of the four corners
	  var n00 = gradP[X+perm[Y]].dot2(x, y);
	  var n01 = gradP[X+perm[Y+1]].dot2(x, y-1);
	  var n10 = gradP[X+1+perm[Y]].dot2(x-1, y);
	  var n11 = gradP[X+1+perm[Y+1]].dot2(x-1, y-1);
  
	  // Compute the fade curve value for x
	  var u = fade(x);
  
	  // Interpolate the four results
	  return lerp(
		  lerp(n00, n10, u),
		  lerp(n01, n11, u),
		 fade(y));
	};
  
	// 3D Perlin Noise
	module.perlin3 = function(x, y, z) {
	  // Find unit grid cell containing point
	  var X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z);
	  // Get relative xyz coordinates of point within that cell
	  x = x - X; y = y - Y; z = z - Z;
	  // Wrap the integer cells at 255 (smaller integer period can be introduced here)
	  X = X & 255; Y = Y & 255; Z = Z & 255;
  
	  // Calculate noise contributions from each of the eight corners
	  var n000 = gradP[X+  perm[Y+  perm[Z  ]]].dot3(x,   y,     z);
	  var n001 = gradP[X+  perm[Y+  perm[Z+1]]].dot3(x,   y,   z-1);
	  var n010 = gradP[X+  perm[Y+1+perm[Z  ]]].dot3(x,   y-1,   z);
	  var n011 = gradP[X+  perm[Y+1+perm[Z+1]]].dot3(x,   y-1, z-1);
	  var n100 = gradP[X+1+perm[Y+  perm[Z  ]]].dot3(x-1,   y,   z);
	  var n101 = gradP[X+1+perm[Y+  perm[Z+1]]].dot3(x-1,   y, z-1);
	  var n110 = gradP[X+1+perm[Y+1+perm[Z  ]]].dot3(x-1, y-1,   z);
	  var n111 = gradP[X+1+perm[Y+1+perm[Z+1]]].dot3(x-1, y-1, z-1);
  
	  // Compute the fade curve value for x, y, z
	  var u = fade(x);
	  var v = fade(y);
	  var w = fade(z);
  
	  // Interpolate
	  return lerp(
		  lerp(
			lerp(n000, n100, u),
			lerp(n001, n101, u), w),
		  lerp(
			lerp(n010, n110, u),
			lerp(n011, n111, u), w),
		 v);
	};
  
  })(this);

/***/ }),

/***/ "./src/node/Node.js":
/*!**************************!*\
  !*** ./src/node/Node.js ***!
  \**************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const vec = __webpack_require__(/*! ../geometry/vec.js */ "./src/geometry/vec.js");

/**
 * @class Node
 * @description Generic node object
 */
module.exports = class Node {
	static id = 0;
	/**
	 * @memberof Node
	 * @description Generates a unique id for nodes
	 * @returns {Number} A unique integer id
	 */
	static getUniqueId() {
		return ++Node.id;
	}

	position = new vec(0, 0);
	angle = 0;
	children = new Set();
	added = false;

	constructor() {
		this.id = Node.getUniqueId();
	}

	/**
	 * @memberof Node
	 * @method setPosition
	 * @description Sets this node's position to `position`
	 * @example
	 * node.setPosition(new vec(100, 100)); // Sets node's position to (100, 100) 
	 * @param {vec} position - Position the node should be set to
	 */
	setPosition(position) {
		let delta = position.sub(this.position);
		this.translate(delta);
	}
	/**
	 * @memberof Node
	 * @method translate
	 * @description Shifts this node's position by `positionDelta`
	 * @param {vec} positionDelta - Amount to shift the position
	 */
	translate(positionDelta) {
		this.position.add2(positionDelta);
		for (let child of this.children) {
			child.translate(delta);
		}
	}
	
	/**
	 * @memberof Node
	 * @method setAngle
	 * @description Sets the node's angle to `angle`
	 * @param {Number} angle - Angle body should be in radians
	 * @example
	 * node.setAngle(Math.PI); // Sets node's angle to Pi radians, or 180 degrees 
	 * @returns {void}
	 */
	setAngle(angle) {
		if (isNaN(angle)) return;
		if (angle !== this.angle) {
			let delta = Common.angleDiff(angle, this.angle);
			this.translateAngle(delta);
		}
	}
	
	/**
	 * @memberof Node
	 * @method translateAngle
	 * @description Rotates the body by `angle`- Relative
	 * @param {Number} angle - The amount the body should be rotated, in radians
	 * @param {Boolean} silent - If the body's angle should be affected
	 * @returns {void}
	 */
	translateAngle(angle) {
		if (isNaN(angle)) return;

		this.angle += angle;

		for (let child of this.children) {
			child.translateAngle?.(angle);
		}
	}

	/**
	 * @memberof Node
	 * @method add
	 * @description Adds this node and its children
	 * @returns {void}
	 */
	add() {
		if (!this.added) {
			this.trigger("add");
			this.added = true;

			for (let child of this.children) {
				child.add();
			}
		}
	}
	/**
	 * @memberof Node
	 * @method delete
	 * @description Removes this node and its children
	 * @returns {void}
	 */
	delete() {
		if (this.added) {
			this.trigger("delete");
			this.added = false;
	
			for (let child of this.children) {
				child.delete();
			}
		}
	}

	/**
	 * @memberof Node
	 * @method addChild
	 * @description all `children` to this node's children
	 * @param {...Node} children - The child nodes to be added
	 */
	addChild(...children) {
		for (let child of children) {
			this.children.add(child);
		}
	}
	/**
	 * @memberof Node
	 * @method removeChild
	 * @description Removes all `children` from this node's children
	 * @param {...Node} children - The child nodes to be removed
	 */
	removeChild(...children) {
		for (let child of children) {
			this.children.delete(child);
		}
	}

	
	#events = {
		delete: [],
		add: [],
	}
	/**
	 * @memberof Node
	 * @method on
	 * @description Bind a callback to an event
	 * @param {String} event - The name of the event
	 * @param {Function} callback - The callback run when event is fired
	 */
	on(event, callback) {
		if (this.#events[event]) {
			this.#events[event].push(callback);
		}
		else {
			console.warn(event + " is not a valid event");
		}
	}
	/**
	 * @memberof Node
	 * @method off
	 * @description Unbinds a callback from an event
	 * @param {String} event - The name of the event
	 * @param {Function} callback - The function to unbind
	 */
	off(event, callback) {
		event = this.#events[event];
		if (event.includes(callback)) {
			event.splice(event.indexOf(callback), 1);
		}
	}
	/**
	 * @memberof Node
	 * @method trigger
	 * @description Triggers an event
	 * @param {String} event - Name of the event
	 */
	trigger(event) {
		// Trigger each event
		if (this.#events[event]) {
			this.#events[event].forEach(callback => {
				callback();
			});
		}
	}
}


/***/ }),

/***/ "./src/node/World.js":
/*!***************************!*\
  !*** ./src/node/World.js ***!
  \***************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const Node = __webpack_require__(/*! ../node/Node.js */ "./src/node/Node.js");
const Common = __webpack_require__(/*! ../core/Common.js */ "./src/core/Common.js")
const Grid = __webpack_require__(/*! ../geometry/Grid.js */ "./src/geometry/Grid.js");
const vec = __webpack_require__(/*! ../geometry/vec.js */ "./src/geometry/vec.js");
const RigidBody = __webpack_require__(/*! ../physics/RigidBody.js */ "./src/physics/RigidBody.js");

/**
 * The game world
 * @class World
 * @extends Node
 */
module.exports = class World extends Node {
	static defaultOptions = {
		gravity: new vec(0, 500),
		gridSize: 500,
	}
	
	gravity = new vec(0, 0);
	timescale = 1;
	time = 0;

	bodies = new Set();
	constraints = new Set();
	pairs = {};

	dynamicGrid;
	staticGrid;
	
	globalPoints = [];
	globalVectors = [];
	
	constructor(options = {}) {
		super();
		let defaults = { ...World.defaultOptions };
		Common.merge(defaults, options, 1);
		options = defaults;

		let { gravity, gridSize } = options;
		this.gravity = new vec(gravity);
		this.dynamicGrid = new Grid(gridSize);
		this.staticGrid = new Grid(gridSize);
	}

	canCollide(filterA, filterB) {
		let { layer: layerA, mask: maskA } = filterA;
		let { layer: layerB, mask: maskB } = filterB;

		let canA = (maskA & layerB) !== 0;
		let canB = (maskB & layerA) !== 0;

		return canA || canB;
	}
	#getPairs(bodies) {
		let pairs = [];
		let canCollide = this.canCollide;

		for (let i = 0; i < bodies.length - 1; i++) {
			let bodyA = bodies[i];
			if (!bodyA.added) {
				if (bodyA.isStatic) {
					this.staticGrid.removeBody(bodyA);
				}
				else {
					this.dynamicGrid.removeBody(bodyA);
				}
				continue;
			}
			if (!bodyA.hasCollisions)
				continue;
			
			for (let j = i + 1; j < bodies.length; j++) {
				// Do AABB collision test
				let bodyB = bodies[j];

				if (!bodyB.added) {
					if (bodyB.isStatic) {
						this.staticGrid.removeBody(bodyB);
					}
					else {
						this.dynamicGrid.removeBody(bodyB);
					}
					continue;
				}
				if (!bodyB.hasCollisions || bodyA.parent && bodyA.parent === bodyB.parent)
					continue;
				if (!canCollide(bodyA.collisionFilter, bodyB.collisionFilter))
					continue;
				

				const boundsA = bodyA.bounds;
				const boundsB = bodyB.bounds;

				if (boundsA.min.x <= boundsB.max.x &&
					boundsA.max.x >= boundsB.min.x &&
					boundsA.min.y <= boundsB.max.y &&
					boundsA.max.y >= boundsB.min.y) {
					pairs.push([ bodyA, bodyB ]);
				}
			}
		}

		return pairs;
	}
	get collisionPairs() {
		let canCollide = this.canCollide;
		let dynamicGrid = this.dynamicGrid;
		let staticGrid = this.staticGrid;
		let pair = Common.pairCommon;
		let pairIds = new Set();
		let pairs = [];

		let dynamicBuckets = dynamicGrid.grid;
		let staticBuckets = staticGrid.grid;
		let bucketIds = dynamicGrid.gridIds;

		for (let id of bucketIds) {
			let curDynamicBucket = dynamicBuckets[id];
			let curStaticBucket = staticBuckets[id];
			let curPairs = this.#getPairs(curDynamicBucket); // pair dynamic bodies

			// add static bodies
			if (curStaticBucket) {
				for (let j = 0; j < curDynamicBucket.length; j++) {
					let bodyA = curDynamicBucket[j];
					if (!bodyA.hasCollisions)
						continue;
					for (let k = 0; k < curStaticBucket.length; k++) {
						let bodyB = curStaticBucket[k];

						if (!bodyB.hasCollisions || bodyA.isStatic && bodyB.isStatic || bodyA.parent && bodyA.parent === bodyB.parent)
							continue;
						if (!canCollide(bodyA.collisionFilter, bodyB.collisionFilter))
							continue;
	
	
						const boundsA = bodyA.bounds;
						const boundsB = bodyB.bounds;
						
						if (boundsA.min.x <= boundsB.max.x &&
							boundsA.max.x >= boundsB.min.x &&
							boundsA.min.y <= boundsB.max.y &&
							boundsA.max.y >= boundsB.min.y) {
							curPairs.push([ bodyA, bodyB ]);
						}
					}
				}
			}

			for (let j = 0; j < curPairs.length; j++) {
				let curPair = curPairs[j];
				let n = pair(curPair[0].id, curPair[1].id);
				if (!pairIds.has(n)) {
					pairIds.add(n);
					pairs.push(curPair);
				}
			}
		}

		return pairs;
	}

	addChild(...children) {
		super.addChild(...children);

		for (let child of children) {
			// Add to engine
			if (child instanceof RigidBody) {
				this.bodies.add(child);
			}

			// Add to grids
			if (child.isStatic) {
				this.staticGrid.addBody(child);
			}
			else {
				this.dynamicGrid.addBody(child);
			}
		}
	}
	removeChild(...children) {
		super.removeChild(...children);

		for (let child of children) {
			// Add to engine
			if (child instanceof RigidBody) {
				this.bodies.delete(child);
			}

			// Remove from grids
			if (child._Grids) {
				if (child._Grids[this.staticGrid.id]) {
					this.staticGrid.removeBody(child);
				}
				if (child._Grids[this.dynamicGrid.id]) {
					this.dynamicGrid.removeBody(child);
				}
			}
		}
	}
}


/***/ }),

/***/ "./src/physics/Engine.js":
/*!*******************************!*\
  !*** ./src/physics/Engine.js ***!
  \*******************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const vec = __webpack_require__(/*! ../geometry/vec.js */ "./src/geometry/vec.js");
const Common = __webpack_require__(/*! ../core/Common.js */ "./src/core/Common.js");
const Performance = __webpack_require__(/*! ../core/Performance.js */ "./src/core/Performance.js");
const RigidBody = __webpack_require__(/*! ./RigidBody.js */ "./src/physics/RigidBody.js");

/**
 * The physics engine
 * @class Engine
 */
module.exports = class Engine {
	static defaultOptions = {
		delta: 1,
		substeps: 5,
		velocityIterations: 1,
		positionIterations: 5,
		constraintIterations: 1,
		maxShare: 1,
	}

	delta = 1;
	substeps = 5;
	velocityIterations = 1;
	positionIterations = 5;
	constraintIterations = 1;
	maxShare = 1;

	/**
	 * 
	 * @param {World} World - The world the physics engine should run on
	 * @param {Object} options - Options for the engine, see documentation for possible options
	 */
	constructor(World, options = {}) {
		let defaults = { ...Engine.defaultOptions };
		Common.merge(defaults, options, 1);
		options = defaults;
		
		// Shallow copy options
		let mutableProperties = [`substeps`, `velocityIterations`, `positionIterations`, `constraintIterations`, `maxShare`];
		for (let propertyName of mutableProperties) {
			if (options[propertyName] != undefined && typeof this[propertyName] != "function") {
				this[propertyName] = options[propertyName];
			}
		}
		this.World = World;
		this.Performance = new Performance();
	}

	/**
	 * Ticks the engine one frame
	 * @param {Number} [delta] - (Optional) Engine tick duration, in seconds
	 */
	update = function(delta) {
		const { World, Performance, substeps } = this;
		const { bodies } = World;

		// Get delta
		if (delta === undefined) {
			delta = Performance.delta * World.timescale;
		}
		World.time += delta;
		delta /= substeps;
		this.delta = delta;

		// Get timing
		Performance.update();

		for (let step = 0; step < substeps; step++) {
			Performance.frame++;
			
			// Update positions / angles
			for (let body of bodies) {
				body._update(delta);
			}
			
			// Find collisions
			World.globalVectors = [];
			World.globalPoints = [];
			
			const pairs = World.collisionPairs;
			for (let i = 0; i < pairs.length; i++) {
				let bodyA = pairs[i][0];
				let bodyB = pairs[i][1];	
				if (this.collides(bodyA, bodyB)) {
					this.createPair(bodyA, bodyB);
				}
			}

			// Apply forces
			for (let body of bodies) {
				body._preUpdate(delta);
			}

			// Solve for velocities
			for (let i = 0; i < this.velocityIterations; i++) {
				this.solveVelocity(delta);
			}
			for (let i = 0; i < this.positionIterations; i++) {
				this.solvePositions();
			}
			this.solveConstraints(delta);
		}

		this.delta = delta * substeps;
	}

	/**
	 * Checks if `bodyA` and `bodyB` are colliding
	 * @param {RigidBody} bodyA - 1st body to check
	 * @param {RigidBody} bodyB - 2nd body to check
	 * @returns {Boolean} If the bodies are colliding
	 */
	collides(bodyA, bodyB) {
		if (bodyA.isStatic && bodyB.isStatic) return false;

		let collision = true;

		function getAllSupports(body, direction) {
			let vertices = body.vertices;
			let maxDist = -Infinity;
			let minDist = Infinity;
			// let maxVert, minVert;

			for (let i = 0; i < vertices.length; i++) {
				let dist = direction.dot(vertices[i]);

				if (dist > maxDist) {
					maxDist = dist;
					// maxVert = i;
				}
				if (dist < minDist) {
					minDist = dist;
					// minVert = i;
				}
			}

			return { max: maxDist, min: minDist };
		}

		// - find if colliding with SAT
		// ~ reuse last separation axis
		if (bodyA._lastSeparations[bodyB.id]) {
			let axis = bodyA._lastSeparations[bodyB.id];
			let supportsA = getAllSupports(bodyA, axis);
			let supportsB = getAllSupports(bodyB, axis);
			let overlap = Math.min(supportsA.max - supportsB.min, supportsB.max - supportsA.min);

			if (overlap < 0) {
				collision = false;
			}
			else {
				delete bodyA._lastSeparations[bodyB.id];
				delete bodyB._lastSeparations[bodyA.id];
			}
		}
		if (collision) { // last separation didn't work - try all axes
			// ~ bodyA axes
			for (let j = 0; j < bodyA._axes.length; j++) {
				let axis = bodyA._axes[j];
				let supportsA = getAllSupports(bodyA, axis);
				let supportsB = getAllSupports(bodyB, axis);
				let overlap = Math.min(supportsA.max - supportsB.min, supportsB.max - supportsA.min);

				if (overlap < 0) {
					collision = false;
					bodyA._lastSeparations[bodyB.id] = axis;
					bodyB._lastSeparations[bodyA.id] = axis;
					break;
				}
			}
			// ~ bodyB axes
			for (let j = 0; j < bodyB._axes.length; j++) {
				let axis = bodyB._axes[j];
				let supportsA = getAllSupports(bodyB, axis);
				let supportsB = getAllSupports(bodyA, axis);
				let overlap = Math.min(supportsA.max - supportsB.min, supportsB.max - supportsA.min);
				
				if (overlap < 0) {
					collision = false;
					bodyA._lastSeparations[bodyB.id] = axis;
					bodyB._lastSeparations[bodyA.id] = axis;
					break;
				}
			}
		}
		return collision;
	}

	/**
	 * Creates a collision pair between `bodyA` and `bodyB`
	 * @param {RigidBody} bodyA - 1st body to pair
	 * @param {RigidBody} bodyB - 2nd body to pair
	 */
	createPair(bodyA, bodyB) {
		const { World, Performance } = this;
		let minDepth = Infinity;
		let normal;
		let normalPoint;
		let contactBody;
		let normalBody;
		let contacts = [];
		let numContacts = 0;

		// - get collision normal by finding point/edge pair with minimum depth
		function findNormal(bodyA, bodyB) {
			let vertices = bodyA.vertices;
			for (let i = 0; i < vertices.length; i++) {
				let curVertice = vertices[i];
				let nextVertice = vertices[(i + 1) % vertices.length];
				let curNormal = curVertice.sub(nextVertice).normal().normalize();
				let support = bodyB._getSupport(curNormal, curVertice);

				if (bodyB.containsPoint(curVertice)) {
					contacts.push({ vertice: curVertice, body: bodyA });
					numContacts++;
				}

				if (support[1] < minDepth) {
					minDepth = support[1];
					normal = curNormal.mult(-1);
					normalPoint = curVertice.avg(nextVertice);

					normalBody = bodyB;
					contactBody = bodyA;
				}
			}
		}

		findNormal(bodyA, bodyB);
		findNormal(bodyB, bodyA);

		if (contacts.length === 0) {
			contacts.push({ vertice: new vec(bodyA.position), body: bodyA });
		}

		normal.mult2(-1);
		World.globalVectors.push({ position: normalPoint, vector: new vec(normal) });
		World.globalPoints.push(...contacts.map(v => v.vertice));

		let pairId = Common.pairCommon(bodyA.id, bodyB.id);
		let pair = {
			bodyA: contactBody,
			bodyB: normalBody,
			depth: minDepth,
			penetration: normal.mult(minDepth),
			contacts: contacts,
			totalContacts: numContacts,
			normal: normal,
			tangent: normal.normal(),

			id: pairId,
			frame: Performance.frame,
			start: World.time,
		}

		if (World.pairs[pairId]) { // Collision happened last frame, so it's active
			pair.start = World.pairs[pairId].start;
			bodyA.trigger("collisionActive", pair);
			bodyB.trigger("collisionActive", pair);

			bodyA.trigger("bodyInside", bodyB);
			bodyB.trigger("bodyInside", bodyA);
		}
		else { // No collision between these bodies last frame, so collision just started
			bodyA.trigger("collisionStart", pair);
			bodyB.trigger("collisionStart", pair);

			bodyA.trigger("bodyEnter", bodyB);
			bodyB.trigger("bodyEnter", bodyA);
			
			bodyA.pairs.push(pairId);
			bodyB.pairs.push(pairId);
		}

		World.pairs[pairId] = pair;
	}

	/**
	 * Deletes the collision pair
	 * @param {collisionPair} pair - The pair to delete
	 * @returns {Boolean} If pair was successfully removed, meaning they are no longer colliding
	 */
	cleansePair(pair) {
		const { Performance, World } = this;
		if (pair.frame < Performance.frame) {
			let { bodyA, bodyB } = pair;

			// Remove pair
			bodyA.pairs.splice(bodyA.pairs.indexOf(pair.id), 1);
			bodyB.pairs.splice(bodyB.pairs.indexOf(pair.id), 1);
			delete World.pairs[pair.id];

			// Trigger collisionEnd event
			bodyA.trigger("collisionEnd", pair);
			bodyB.trigger("collisionEnd", pair);

			bodyA.trigger("bodyExit", bodyB);
			bodyB.trigger("bodyExit", bodyA);

			return true;
		}
		return false;
	}

	/**
	 * Solves velocity constriants on current collision pairs
	 * Also clears collision pairs that are no longer valid (they haven't collided this frame)
	 * @returns {void}
	 */
	solveVelocity = function() {
		let { pairs } = this.World;
		
		for (let i in pairs) {
			let pair = pairs[i];
			if (!pair || this.cleansePair(pair)) continue;

			let { bodyA, bodyB, normal, tangent, contacts } = pair;
			let numContacts = contacts.length;
			if (numContacts === 0) continue;

			while (bodyA.parent instanceof RigidBody && bodyA.parent !== bodyA) {
				bodyA = bodyA.parent;
			}
			while (bodyB.parent instanceof RigidBody && bodyB.parent !== bodyB) {
				bodyB = bodyB.parent;
			}
			if (bodyA.isSensor || bodyB.isSensor) continue;

			const restitution = 1 + Math.max(bodyA.restitution, bodyB.restitution);
			const relVel = bodyB.velocity.sub(bodyA.velocity);
			const friction = Math.max(bodyA.friction, bodyB.friction);
			const slop = Math.max(bodyA._slop, bodyB._slop);

			if (relVel.dot(normal) < 0) {
				continue;
			}

			let impulse = new vec(0, 0);
			let angImpulseA = 0;
			let angImpulseB = 0;

			let totalMass = bodyA.mass + bodyB.mass;
			let shareA = (bodyB.mass / totalMass) || 0;
			let shareB = (bodyA.mass / totalMass) || 0;
			let maxShare = this.maxShare;
			shareA = Math.min(maxShare, shareA);
			shareB = Math.min(maxShare, shareB);
			if (bodyA.isStatic) shareB = 1;
			if (bodyB.isStatic) shareA = 1;

			for (let c = 0; c < numContacts; c++) {
				const { vertice } = contacts[c];

				const offsetA = vertice.sub(bodyA.position);
				const offsetB = vertice.sub(bodyB.position);
				const vpA = bodyA.velocity.add(offsetA.normal().mult(-bodyA.angularVelocity));
				const vpB = bodyB.velocity.add(offsetB.normal().mult(-bodyB.angularVelocity));
				var relativeVelocity = vpA.sub(vpB);
				const normalVelocity = relativeVelocity.abs().sub(slop).mult(relativeVelocity.sign()).dot(normal);
				const tangentVelocity = relativeVelocity.dot(tangent);

				if (normalVelocity > 0) continue;
				let oAcN = offsetA.cross(normal);
				let oBcN = offsetB.cross(normal);
				let share = 1 / (contacts.length * (bodyA._inverseMass + bodyB._inverseMass + bodyA._inverseInertia * oAcN * oAcN + bodyB._inverseInertia * oBcN * oBcN));
				
				const normalImpulse = restitution * normalVelocity * share;
				const tangentImpulse = restitution * tangentVelocity * share;

				const curImpulse = normal.mult(normalImpulse).add2(tangent.mult(tangentImpulse * friction));
				impulse.add2(curImpulse);
				angImpulseA += offsetA.cross(curImpulse) * bodyA._inverseInertia;
				angImpulseB += offsetB.cross(curImpulse) * bodyB._inverseInertia;
			}
			
			if (!bodyA.isStatic) {
				bodyA.velocity.sub2(impulse.mult(1 / bodyA.mass));
				bodyA.angularVelocity -= angImpulseA / bodyA.mass;
			}
			if (!bodyB.isStatic) {
				bodyB.velocity.add2(impulse.mult(1 / bodyB.mass));
				bodyB.angularVelocity += angImpulseB / bodyB.mass;
			}
		}
	}
	
	/**
	 * Solves position intersections between bodies based on their collision pairs
	 */
	solvePositions = function() {
		const { World } = this;
		let { pairs } = World;
		
		for (let i in pairs) {
			let pair = pairs[i];
			if (!pair || this.cleansePair(pair)) continue;
			let { depth, bodyA, bodyB, normal } = pair;
			// depth = Math.min(depth, 15);
			
			while (bodyA.parent && bodyA.parent !== bodyA) {
				bodyA = bodyA.parent;
			}
			while (bodyB.parent && bodyB.parent !== bodyB) {
				bodyB = bodyB.parent;
			}
			if (bodyA.isSensor || bodyB.isSensor) continue;
			
			if (depth < 1) continue;

			let impulse = normal.mult(depth - 1);
			let totalMass = bodyA.mass + bodyB.mass;
			let shareA = (bodyB.mass / totalMass) || 0;
			let shareB = (bodyA.mass / totalMass) || 0;
			let maxShare = this.maxShare;
			shareA = Math.min(maxShare, shareA);
			shareB = Math.min(maxShare, shareB);
			if (bodyA.isStatic) shareB = 1;
			if (bodyB.isStatic) shareA = 1;
			if (bodyA.isStatic || bodyB.isStatic) impulse.mult(0);

			if (!bodyA.isStatic) {
				let a = impulse.mult(shareA * 0.95 / bodyA.pairs.length);
				bodyA.translate(a);
			}
			if (!bodyB.isStatic) {
				let a = impulse.mult(-shareB * 0.95 / bodyB.pairs.length);
				bodyB.translate(a);
			}
			pair.depth -= impulse.length;
		}
	}

	/**
	 * Solves physics constraints for their new position and velocity
	 * @param {Number} delta - Engine tick duration, in seconds
	 * @returns {void}
	 */
	solveConstraints = function(delta) {
		delta *= 1000;
		const constraints = this.World.constraints;
		const constraintIterations = this.constraintIterations;
		delta /= constraintIterations;

		for (let step = 0; step < constraintIterations; step++) {
			for (let i = 0; i < constraints.length; i++) {
				let constraint = constraints[i];
				let { bodyA, bodyB, offsetA, offsetB, stiffness, angularStiffness, length, ignoreSlack } = constraint;
				let pointA = bodyA.position.add(offsetA.rotate(bodyA.angle));
				let pointB = bodyB.position.add(offsetB.rotate(bodyB.angle));

				// constraint velocity solver
				let diff = pointA.sub(pointB);
				let normal = diff.normalize();
				let tangent = normal.normal();

				let totalMass = bodyA.mass + bodyB.mass;
				let shareA = (bodyB.mass / totalMass) || 0;
				let shareB = (bodyA.mass / totalMass) || 0;
				let maxShare = this.maxShare;
				shareA = Math.min(maxShare, shareA);
				shareB = Math.min(maxShare, shareB);
				if (bodyA.isStatic) shareB = 1;
				if (bodyB.isStatic) shareA = 1;

				function solveImpulse(vertice, point, body) { // vertice = where the constraint goes to, point = where the constraint is
					let offset = point.sub(body.position);
					let offsetLen = offset.length;
					if (offsetLen > length * 3) {
						offset.mult2(length / offsetLen);
					}
					const vp1 = body.velocity.add(offset.normal().mult(-body.angularVelocity));
					const vp2 = vertice.sub(point).mult(stiffness * 30);
					if (ignoreSlack && diff.length < length * (1 + stiffness)) { // idk how to get this to work
						vp1.mult2(0);
						vp2.mult2(0);
					}
					const relativeVelocity = vp1.sub(vp2);
					const normalVelocity = relativeVelocity.dot(normal);
					const tangentVelocity = relativeVelocity.dot(tangent);
					let tangentImpulse = tangentVelocity;
					
					let normalImpulse = (stiffness) * normalVelocity; // min is to prevent breakage
					normalImpulse = Math.min(Math.abs(normalImpulse), 300) * Math.sign(normalImpulse);
					let curImpulse = normal.mult(normalImpulse).add2(tangent.mult(tangentImpulse * angularStiffness));

					return {
						angularImpulse: offset.cross(curImpulse) * body._inverseInertia / 2,
						normalImpulse: curImpulse.mult(0.5),
					}
				}

				let impulseDiff = pointA.sub(pointB).normalize().mult(length);
				let impulsePtA = bodyA.isStatic ? pointA : pointB.add(impulseDiff);
				let impulsePtB = bodyB.isStatic ? pointB : pointA.sub(impulseDiff);

				let { angularImpulse: angImpulseA, normalImpulse: impulseA } = solveImpulse(impulsePtA, pointA, bodyA);
				let { angularImpulse: angImpulseB, normalImpulse: impulseB } = solveImpulse(impulsePtB, pointB, bodyB);
				
				if (!bodyA.isStatic) {
					bodyA.velocity.sub2(impulseA.mult(shareA * delta));
					bodyA.angularVelocity -= angImpulseA * shareA * delta;
				}
				if (!bodyB.isStatic) {
					bodyB.velocity.sub2(impulseB.mult(shareB * delta));
					bodyB.angularVelocity -= angImpulseB * shareB * delta;
				}

				// constraint position solver
				// let nextLength = pointA.sub(pointB).length + (length - pointA.sub(pointB).length) * stiffness;
				// let changeA = nextLength - impulsePtB.sub(bodyA.position).length;
				// changeA = Math.min(50, Math.abs(changeA)) * Math.sign(changeA);
				// let changeB = nextLength - impulsePtA.sub(bodyB.position).length;
				// changeB = Math.min(50, Math.abs(changeB)) * Math.sign(changeB);

				// bodyA.translate(normal.mult((changeA) * shareA * delta * 0.05));
				// bodyB.translate(normal.mult((changeB) * shareB * delta * 0.05));

				constraint.updateBounds();
			}

		}
	}
};


/***/ }),

/***/ "./src/physics/RigidBody.js":
/*!**********************************!*\
  !*** ./src/physics/RigidBody.js ***!
  \**********************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const vec = __webpack_require__(/*! ../geometry/vec.js */ "./src/geometry/vec.js");
const Node = __webpack_require__(/*! ../node/Node.js */ "./src/node/Node.js");
const Common = __webpack_require__(/*! ../core/Common.js */ "./src/core/Common.js");
const PolygonRender = __webpack_require__(/*! ../render/PolygonRender.js */ "./src/render/PolygonRender.js");
const Sprite = __webpack_require__(/*! ../render/Sprite.js */ "./src/render/Sprite.js");
const Bezier = __webpack_require__(/*! ../geometry/Bezier.js */ "./src/geometry/Bezier.js");
const Bounds = __webpack_require__(/*! ../geometry/Bounds.js */ "./src/geometry/Bounds.js");

/**
 * @class RigidBody
 * @description A rigid body with physics
 * @extends Node
 */
module.exports = class RigidBody extends Node {
	static defaultOptions = { // not used, but consistent with other classes for documentation
		mass: 1,
		restitution: 0.5,
		frictionAir: 0.05,
		frictionAngular: 0.01,
		friction: 0.01,
		round: 0,
	
		isStatic: false,
		isSensor: false,
		hasCollisions: true,
		collisionFilter: {
			layer: 0xFFFFFF,
			mask: 0xFFFFFF,
		},
	}
	static roundVertices(vertices, round, dx = 40) {
		let newVertices = [];
		let verticesLength = vertices.length;
		for (let i = 0; i < verticesLength; i++) {
			let prev = vertices[(i - 1 + verticesLength) % verticesLength];	
			let cur = vertices[i];	
			let next = vertices[(i + 1) % verticesLength];	

			// get vectors
			let prevToCur = cur.sub(prev);
			let curToNext = next.sub(cur);
			let prevCurNormalized = prevToCur.normalize();
			let curNextNormalized = curToNext.normalize();

			// get round amount
			let prevRound = Math.min(round, prevToCur.length / 2);
			let nextRound = Math.min(round, curToNext.length / 2);
			let curRound = Math.min(prevRound, nextRound);

			let start = prevCurNormalized.mult(-curRound).add(cur);
			let cp1 = prevCurNormalized.mult(-curRound * 0.45).add(cur);
			let cp2 = curNextNormalized.mult(curRound *  0.45).add(cur);
			let end = curNextNormalized.mult(curRound).add(cur);
			let bezier = new Bezier(start, cp1, cp2, end);
			for (let i = 0; i < bezier.length;) {
				newVertices.push(bezier.get(i));
				i += dx;
			}
			newVertices.push(end);
		}
		return newVertices;
	}

	//
	// Public user options
	//
	vertices = [];

	mass = 1;
	restitution = 0.5;
	frictionAir = 0.05;
	frictionAngular = 0.01;
	friction = 0.01;
	round = 0;

	isStatic = false;
	isSensor = false;
	hasCollisions = true;
	collisionFilter = {
		layer: 0xFFFFFF,
		mask: 0xFFFFFF,
	}

	/**
	 * @description Creates a new RigidBody
	 * @param {Array} vertices Array of `vec` representing the body's vertices
	 * @param {vec} position - The position of the body
	 * @param {Engine} Engine - The engine the body should be simulated in
	 * @param {Object} options - RigidBody options, see documentation for options
	 */
	constructor(Engine, vertices, position, options = {}) {
		super();
		if (!this.Engine) this.Engine = Engine;
		
		// Shallow copy World
		this.World = this.Engine.World;
		delete options.World;

		// Shallow copy render
		if (options.render) {
			this.addChild(options.render);
			delete options.render;
		}

		// Merge collision filters
		if (typeof options.collisionFilter === "object") Common.merge(this.collisionFilter, options.collisionFilter, 1);

		// Merge options with body
		Common.merge(this, options, 1);
		
		// Parse collision filter properties
		for (let filterType in ["layer", "mask"]) {
			if (typeof this.collisionFilter[filterType] === "string") {
				this.collisionFilter[filterType] = parseInt(this.collisionFilter[filterType], 2);
			}
		}

		// Convert vertices to vec
		this.vertices = vertices.map(v => new vec(v));
		
		// round vertices
		if (options.round && options.round > 0) {
			this.vertices = RigidBody.roundVertices(this.vertices, this.round, this.roundQuality);
		}

		// Create bounds
		this.bounds = new Bounds(this.vertices);

		// Reset vertices so convex check works properly
		this.#removeDuplicateVertices();
		this._resetVertices(false);

		// Fully reset vertices
		this._resetVertices();
		this._updateInertia();

		// Set angle from options
		if (options.angle) {
			this.angle = 0;
			this.setAngle(-options.angle);
		}
		this.setPosition(position);
	}
	
	//
	// Public user methods
	//
	/**
	 * @memberof RigidBody
	 * @description Adds the body to its world
	 * @returns {RigidBody} `this`
	 */
	add() {
		let World = this.Engine.World;
		if (!this.added) {
			super.add();
			World.addChild(this);
		}
		return this;
	}

	/**
	 * @memberof RigidBody
	 * @description Removes the body from its world
	 * @returns {RigidBody} `this`
	 */
	delete() {
		let World = this.Engine.World;
		if (this.added) {
			super.delete();
			World.removeChild(this);

			for (let i = 0; i < this.pairs.length; i++) {
				this.Engine.cleansePair(this.pairs[i]);
			}
		}
		return this;
	}

	/**
	 * @memberof RigidBody
	 * @method addPolygonRender
	 * @description Adds a polygon render to body
	 * @param {PIXI.Container} container - Container polygon render is added to
	 * @param {Object} options - Options for polygon render, see documentation for possible options
	 * @returns {RigidBody} `this`
	 */
	addPolygonRender(container, options) {
		let render = new PolygonRender({
			container: container,
			position: new vec(this.position),
			vertices: this.vertices,
			
			...options
		});
		if (this.added) render.add();
		this.addChild(render);
		
		return this;
	}

	/**
	 * @memberof RigidBody
	 * @method addSprite
	 * @description Adds a sprite to body
	 * @param {PIXI.Container} container - Container polygon render is added to
	 * @param {Object} options - Sprite options, see documentation for possible options
	 * @returns {RigidBody} `this`
	 */
	addSprite(container, options) {
		let render = new Sprite({
			container: container,
			position: new vec(this.position),
			
			...options
		});
		if (this.added) render.add();
		this.addChild(render);
		
		return this;
	}
	
	/**
	 * @memberof RigidBody
	 * @description Changes if the body is static
	 * @param {Boolean} isStatic - If the body should be static
	 * @returns {void}
	 */
	setStatic(isStatic) {
		let { dynamicGrid, staticGrid } = this.Engine.World;
		let lastStatic = this.isStatic;
		if (isStatic === lastStatic) return;
		
		this.isStatic = isStatic;

		if (this.hasCollisions && !this.removed) {
			if (lastStatic) {
				staticGrid.removeBody(this);
			}
			else {
				dynamicGrid.removeBody(this);
			}

			if (isStatic) {
				staticGrid.addBody(this);
			}
			else {
				dynamicGrid.addBody(this);
			}
		}
	}

	/**
	 * @memberof RigidBody
	 * @description Changes if the body can collide with other bodies
	 * @param {Number} hasCollisions - Whether the body can collide with other bodies
	 * @returns {void}
	 */
	setCollisions(hasCollisions) {
		let { dynamicGrid, staticGrid } = this.Engine.World;
		if (hasCollisions === this.hasCollisions) return;

		this.hasCollisions = hasCollisions;

		if (this.hasCollisions) {
			if (this.isStatic) {
				staticGrid.addBody(this);
			}
			else {
				dynamicGrid.addBody(this);
			}
		}
		else {
			if (this.isStatic) {
				staticGrid.removeBody(this);
			}
			else {
				dynamicGrid.removeBody(this);
			}
		}
	}

	/**
	 * @memberof RigidBody
	 * @description Finds if a point is inside the body
	 * @param {vec} point The point to query
	 * @returns {Boolean} If the point is inside the body's vertices
	 */
	containsPoint(point) {
		let vertices = this.vertices;
		for (let i = 0; i < vertices.length; i++) {
			let curVertice = vertices[i];
			let nextVertice = vertices[(i + 1) % vertices.length];
			
			if ((point.x - curVertice.x) * (nextVertice.y - curVertice.y) + (point.y - curVertice.y) * (curVertice.x - nextVertice.x) >= 0) {
				return false;
			}
		}
		return true;
	}

	/**
	 * @memberof RigidBody
	 * @description Instantly sets body's position to `position`
	 * @param {vec} position - The position the body should be
	 * @param {Boolean} _ignoreChildren - If the body's children should be affected
	 * @example
	 * body.setPosition(new vec(100, 100)); // Sets body's position to (100, 100) 
	 * @returns {void}
	 */
	setPosition(position, _ignoreChildren = false) {
		let delta = position.sub(this.position);
		this.translate(delta, true, _ignoreChildren);
	}
	
	/**
	 * @memberof RigidBody
	 * @description Shifts body's position by delta
	 * @param {vec} delta - Distance the body should be shifted
	 * @param {Boolean} affectPosition - If the body's position should be affected
	 * @param {Boolean} ignoreChildren - If the body's children should be shifted as well
	 * @returns {void}
	 */
	translate(delta, affectPosition = true, ignoreChildren = false) {
		if (delta.isNaN()) return;
		let vertices = this.vertices;
		for (let i = 0; i < vertices.length; i++) {
			vertices[i].add2(delta);
		}

		if (affectPosition) {
			this.position.add2(delta);
		}
		this.bounds.update(this.vertices);

		let tree = this.Engine.World.dynamicGrid;
		if (this._Grids && this._Grids[tree.id]) {
			tree.updateBody(this);
		}

		if (!ignoreChildren) {
			let children = this.children;
			for (let child of children) {
				child.translate(delta, affectPosition);
			}
		}
	}

	/**
	 * @memberof RigidBody
	 * @description Rotates the body to `angle` - Absolute
	 * @param {Number} angle - Angle body should be in radians
	 * @example
	 * body.setAngle(Math.PI); // Sets body's angle to Pi radians, or 180 degrees 
	 * @returns {void}
	 */
	setAngle(angle) {
		if (isNaN(angle)) return;
		if (angle !== this.angle) {
			let delta = Common.angleDiff(angle, this.angle);
			this.translateAngle(delta);
		}
	}

	/**
	 * @memberof RigidBody
	 * @description Rotates the body by `angle`- Relative
	 * @param {Number} angle - The amount the body should be rotated, in radians
	 * @param {Boolean} silent - If the body's angle should be affected
	 * @returns {void}
	 */
	translateAngle(angle, silent = false) {
		if (isNaN(angle)) return;
		let vertices = this.vertices;
		let position = this.position;
		let rotationPoint = this.rotationPoint.rotate(this.angle + angle);
		if (this.parent) {
			rotationPoint.add2(this.position.sub(this.parent.position));
		}
		let sin = Math.sin(angle);
		let cos = Math.cos(angle);

		for (let i = vertices.length; i-- > 0;) {
			let vert = vertices[i];
			let dist = vert.sub(position);
			vert.x = position.x + (dist.x * cos - dist.y * sin);
			vert.y = position.y + (dist.x * sin + dist.y * cos);
		}

		let posOffset = rotationPoint.sub(rotationPoint.rotate(angle));
		this.translate(posOffset);
		if (!silent) {
			this.angle += angle;
		}

		this.bounds.update(this.vertices);
		this.#updateAxes();

		for (let child of this.children) {
			child.translateAngle?.(angle, silent);
		}
	}

	/**
	 * @memberof RigidBody
	 * @description Instantly changes the body's velocity to a specific value
	 * @param {vec} velocity - The velocity the body should have
	 * @returns {void}
	 */
	setVelocity(velocity) {
		if (velocity.isNaN()) {
			console.error(velocity);
			throw new Error("Invalid velocity");
		}
		if (this.isStatic) return;
		this.velocity.set(velocity);
	}

	/**
	 * @memberof RigidBody
	 * @description Instantly changes the body's angular velocity to a specific value
	 * @param {vec} velocity - The angular velocity the body should have
	 * @returns {void}
	 */
	setAngularVelocity(velocity) {
		if (velocity.isNaN()) {
			console.error(velocity);
			throw new Error("Invalid angular velocity");
		}
		if (this.isStatic) return;
		this.angularVelocity = velocity;
	}

	/**
	 * @memberof RigidBody
	 * @description Applies a force to the body, ignoring mass. The body's velocity changes by force * delta
	 * @param {vec} force - The amount of force to be applied, in px / sec^2
	 * @param {Number} delta - The amount of time that the force should be applied in seconds, set to 1 if only applying in one instant
	 * @returns {void}
	 */
	applyForce(force, delta = Engine.delta) { // set delta to 1 if you want to apply a force for only 1 frame
		if (force.isNaN()) return;
		if (this.isStatic) return;
		this.force.add2(force.mult(delta));
	}
	
	/**
	 * @memberof RigidBody
	 * @description Applies a rotational force (torque) to the body, ignoring mass. The body's angular velocity changes by force * delta
	 * @param {Number} force - The amount of torque to be applied, in radians / sec^2
	 * @param {Number} delta - The amount of time the force should be applied in seconds, set to 1 if only applying instantaneous force
	 * @returns {void}
	 */
	applyTorque(force, delta = Engine.delta) { // set delta to 1 if you want to apply a force for only 1 frame
		if (isNaN(force)) return;
		this.torque += force * delta;
	}

	// 
	// Private engine variables
	// 
	nodeType = "RigidBody";
	Engine = null;
	parent = null;

	position = new vec(0, 0);
	velocity = new vec(0, 0);
	angle = 0;
	angularVelocity = 0;
	_last = {
		velocity: new vec(0, 0),
		angularVelocity: 0,
	};
	
	force = new vec(0, 0);
	impulse = new vec(0, 0);
	center = new vec(0, 0);
	torque = 0;
	
	_axes = [];
	rotationPoint = new vec(0, 0);

	_inverseMass = 1;
	inertia = 1;
	_inverseInertia = 0.000015;	

	pairs = [];
	_lastSeparations = {};
	_slop = 0.001;

	bounds = null;

	#events = {
		collisionStart: [],
		collisionActive: [],
		collisionEnd: [],

		bodyEnter: [],
		bodyInside: [],
		bodyExit: [],
		
		beforeUpdate: [], // use to apply forces to current body
		duringUpdate: [], // use to clear forces from current body
		delete: [],
		add: [],
	}

	// 
	// Private engine methods
	// 
	/**
	 * @memberof RigidBody
	 * @private
	 * Prepares the body 
	 * @param {Number} delta - Engine tick duration, in seconds
	 * @returns {void}
	 */
	_preUpdate(delta) {
		this.trigger("beforeUpdate");

		if (this.isStatic) return;

		// apply forces
		this.velocity.add2(this.force).add2(this.Engine.World.gravity.mult(delta));
		this.angularVelocity += this.torque;

		// clear forces
		this.force.x = 0;
		this.force.y = 0;
		this.torque = 0;
	}
	/**
	 * @memberof RigidBody
	 * @private
	 * Updates this body's velocity, position, and grid
	 * @param {Number} delta - Engine tick duration, in seconds
	 * @returns {void}
	 */
	_update(delta) {
		this.trigger("duringUpdate");

		if (this.isStatic) return;

		const timescale = delta;
		let { velocity: lastVelocity, angularVelocity: lastAngularVelocity } = this._last;

		let frictionAir = (1 - this.frictionAir) ** timescale;
		let frictionAngular = (1 - this.frictionAngular) ** timescale;

		if (isNaN(timescale) || this.velocity.isNaN() || isNaN(frictionAir + frictionAngular)) {
			return;
		}
		
		this.velocity.mult2(frictionAir);
		if (this.velocity.x !== 0 || this.velocity.y !== 0){
			this.translate(this.velocity.add(lastVelocity).mult(timescale / 2)); // trapezoidal rule to take into account acceleration
			// body.translate(body.velocity.mult(timescale)); // potentially more stable, but less accurate
		}
		this._last.velocity.set(this.velocity);

		this.angularVelocity *= frictionAngular;
		if (this.angularVelocity){
			this.translateAngle((this.angularVelocity + lastAngularVelocity) * timescale / 2); // trapezoidal rule to take into account acceleration
			// body.translateAngle((body.angularVelocity) * timescale); // potentially more stable, but less accurate
		}
		this._last.angularVelocity = this.angularVelocity;
		
		this.bounds.update(this.vertices);

		if (this.hasCollisions) {
			this.Engine.World.dynamicGrid.updateBody(this);
		}
	}

	/**
	 * @memberof RigidBody
	 * @private
	 * Calculates the area of the body if it is convex
	 * @returns {Number} The area of the body
	 */
	#getArea() {
		let area = 0;
		let vertices = this.vertices;
		let len = vertices.length;
		for (let i = 0; i < len; i++) {
			area += vertices[i].cross(vertices[(i + 1) % len]);
		}
		return area * 0.5;
	}

	/**
	 * @memberof RigidBody
	 * @private
	 * Calculates inertia from the body's vertices
	 * @returns {Number} The body's inertia
	 */
	#getInertia() {
		const { vertices, mass } = this;
		
		let numerator = 0;
		let denominator = 0;

		for (var i = 0; i < vertices.length; i++) {
			let j = (i + 1) % vertices.length;
			let cross = Math.abs(vertices[j].cross(vertices[i]));
			numerator += cross * (vertices[j].dot(vertices[j]) + vertices[j].dot(vertices[i]) + vertices[i].dot(vertices[i]));
			denominator += cross;
		}

		return (mass / 6) * (numerator / denominator);
	}
	/**
	 * @memberof RigidBody
	 * @private
	 * Sets the inertia of the body to what's calculated in `#getInertia()` if the body is not static
	 * @returns {void}
	 */
	_updateInertia() {
		if (this.isStatic) {
			this.mass = Infinity;
			this._inverseMass = 0;
		}
		else {
			this.inertia = this.#getInertia();
			this._inverseInertia = 1 / this.inertia;
		}
	}

	/**
	 * @memberof RigidBody
	 * @private
	 * Removes overlapping vertices
	 * @param {Number} minDist - Minimum distance when points are considered the same
	 * @returns {void}
	 */
	#removeDuplicateVertices(minDist = 1) { // remove vertices that are the same
		let vertices = this.vertices;
		for (let i = 0; i < vertices.length; i++) {
			let curVert = vertices[i];
			
			for (let j = 0; j < vertices.length; j++) {
				if (j === i) continue;
				let nextVert = vertices[j];
				let dist = curVert.sub(nextVert);

				if (Math.abs(dist.x) + Math.abs(dist.y) < minDist) { // just use manhattan dist because it doesn't really matter
					vertices.splice(i, 1);
					i--;
					break;
				}
			}
		}
	}

	/**
	 * @memberof RigidBody
	 * @private
	 * Determines if the body is convex
	 * @returns {Boolean} If the body is convex
	 */
	#isConvex() {
		let vertices = this.vertices;
		let len = vertices.length;

		let last = vertices[0].sub(vertices[1]);
		let sign = 0;
		for (let i = 1; i < len; i++) {
			let cur = vertices[i].sub(vertices[(i + 1) % len]);
			let curSign = Math.sign(cur.cross(last));

			if (sign === 0) {
				sign = curSign;
			}
			else if (curSign !== 0) {
				if (sign !== curSign) {
					return false;
				}
			}
			last = cur;
		}

		return true;
	}

	#getCenterOfMass() {
		let center = Common.getCenterOfMass(this.vertices);
		this.center.set(center);
		return center;
	}

	/**
	 * @memberof RigidBody
	 * @private
	 * Calculates the body's axes from its vertices
	 */
	#updateAxes() {
		let verts = this.vertices;
		let axes = [];

		for (let i = 0; i < verts.length; i++) {
			let curVert = verts[i];
			let nextVert = verts[(i + 1) % verts.length];

			axes.push(nextVert.sub(curVert));
		}
		for (let i = 0; i < axes.length; i++) {
			axes[i] = axes[i].normal().normalize2();
		}

		this._axes = axes;
	}

	/**
	 * @memberof RigidBody
	 * @private
	 * Shifts vertices so their center is at the body's position 
	 */
	#recenterVertices() {
		let center = this.#getCenterOfMass();
		let position = this.position;
		center.sub2(position);
		
		for (let i = 0; i < this.vertices.length; i++) {
			this.vertices[i].sub2(center);
		}
	}

	/**
	 * @memberof RigidBody
	 * @private
	 * Ensures vertices are counterclockwise winding and centered, and updates the area, bounding box, and the axes
	 * @param {Number} forceCCW - If vertices should be forced to be counterclockwise winding by sorting their angles from the center
	 */
	_resetVertices(forceCCW = false) {
		this.#makeCCW(forceCCW);
		this.area = this.#getArea();
		this.#recenterVertices();
		this.bounds.update(this.vertices);
		this.#updateAxes();
	}

	/**
	 * @memberof RigidBody
	 * @private
	 * Tries to ensure the body's vertices are counterclockwise winding, by default by comparing the angles of the first 2 vertices and reversing the vertice array if they're clockwise
	 * @param {Boolean} force - If all vertices should be completely reordered using their angle from the center 
	 */
	#makeCCW(force = false) { // makes vertices go counterclockwise if they're clockwise
		if (force) { // reorders vertices by angle from center - can change order of vertices
			let vertices = this.vertices;
			let center = this.position;
			let mapped = vertices.map(v => [v, v.sub(center).angle]);
			mapped.sort((a, b) => Common.angleDiff(a[1], b[1]));
			this.vertices = mapped.map(v => v[0]);
		}
		else { // reverses vertices if the 1st and 2nd are going wrong direction - never changes order of vertices
			let vertices = this.vertices;
			let center = this.position;
	
			let mapped = vertices.map(v => v.sub(center).angle);
			if (Common.angleDiff(mapped[0], mapped[1]) > 0) {
				this.vertices.reverse();
			}
		}
	}

	/**
	 * @memberof RigidBody
	 * @private
	 * Finds the vertice farthest in a direction
	 * @param {vec} vector - Normalized direction to find the support point
	 * @param {vec} position - Position to base support on
	 * @returns {Array} 
	 */
	_getSupport(vector, position = this.position) {
		let vertices = this.vertices;
		let bestDist = 0;
		let bestVert;
		for (let i = 0; i < vertices.length; i++) {
			let dist = vector.dot(vertices[i].sub(position));

			if (dist > bestDist) {
				bestDist = dist;
				bestVert = i;
			}
		}

		return [ bestVert, bestDist ];
	}
}


/***/ }),

/***/ "./src/render/Camera.js":
/*!******************************!*\
  !*** ./src/render/Camera.js ***!
  \******************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const vec = __webpack_require__(/*! ../geometry/vec.js */ "./src/geometry/vec.js");

/**
 * Handles the game's camera
 * @class Camera
 */
module.exports = class Camera {
	position = new vec(0, 0);
	fov = 2000;
	translation = new vec(0, 0);
	scale = 1;
	boundSize = 1000;

	constructor(fov = 2000, boundSize = 1000) {
		this.fov = fov;
		this.boundSize = boundSize;
	}
};


/***/ }),

/***/ "./src/render/DebugRender.js":
/*!***********************************!*\
  !*** ./src/render/DebugRender.js ***!
  \***********************************/
/***/ ((module) => {

/**
 * Creates a debug rendering context
 * @class DebugRender
 */
module.exports = class DebugRender {
	// - Debug rendering
	canvas = null;
	ctx = null;
	enabled = {
		collisions: false,
		boundingBox: false,
		vertices: false,
		centers: false,
		broadphase: false,
	}

	constructor(Game) {
		this.Game = Game;

		let scale = devicePixelRatio ?? 1;
		let canvas = this.canvas = document.createElement("canvas");
		this.ctx = canvas.getContext("2d");
		canvas.style.position = "absolute";
		canvas.style.zIndex = 1;
		canvas.style.top =  "0px";
		canvas.style.left = "0px";
		canvas.width  = scale * window.innerWidth;
		canvas.height = scale * window.innerHeight;
		canvas.style.background = "transparent";
		canvas.style.pointerEvents = "none";
		canvas.style.transformOrigin = "top left";
		canvas.style.transform = `scale(${1 / scale}, ${1 / scale})`;
		document.body.appendChild(canvas);

		Game.Render.app.renderer.on("resize", (width, height) => {
			let scale = devicePixelRatio ?? 1;
			canvas.width  = width  * scale;
			canvas.height = height * scale;
			canvas.style.transform = `scale(${1 / scale}, ${1 / scale})`;
		});

		this.update = this.update.bind(this);
		Game.Render.app.ticker.add(this.update);
	}
	update() {
		let { ctx, canvas, enabled, Game } = this;
		const { Render } = Game;
		const { camera, pixelRatio } = Render;
		let canvWidth = canvas.width;
		let canvHeight = canvas.height;
		
		const { position:cameraPosition } = camera;
		const scale = camera.scale * pixelRatio;
		let translation = new vec({ x: -cameraPosition.x * scale + canvWidth/2, y: -cameraPosition.y * scale + canvHeight/2 });

		ctx.clearRect(0, 0, canvWidth, canvHeight);
		ctx.save();
		ctx.translate(translation.x, translation.y);
		ctx.scale(scale, scale);

		for (let debugType in enabled) {
			if (enabled[debugType] && typeof this[debugType] === "function") {
				this[debugType]();
			}
		}

		ctx.restore();
	}

	
	vertices() {
		const { Game, ctx } = this;
		const { camera, pixelRatio } = Game.Render;
		const scale = camera.scale * pixelRatio;

		function renderVertices(vertices) {
			ctx.moveTo(vertices[0].x, vertices[0].y);

			for (let j = 0; j < vertices.length; j++) {
				if (j > 0) {
					let vertice = vertices[j];
					ctx.lineTo(vertice.x, vertice.y);
				}
			}

			ctx.closePath();
		}

		ctx.beginPath();
		let allBodies = Game.World.bodies;
		for (let body of allBodies) {
			renderVertices(body.vertices);
		}
		ctx.lineWidth = 2 / scale;
		ctx.strokeStyle = "#FF832A";
		ctx.stroke();
	}
	collisions() {
		const { ctx, Game } = this;
		const { globalPoints, globalVectors } = Game.World;
		
		if (globalPoints.length > 0) { // Render globalPoints
			ctx.beginPath();
			for (let i = 0; i < globalPoints.length; i++) {
				let point = globalPoints[i];
				ctx.moveTo(point.x, point.y);
				ctx.arc(point.x, point.y, 2 / camera.scale, 0, Math.PI*2);
				ctx.fillStyle = "#e8e8e8";
			}
			ctx.fill();
		}
		if (globalVectors.length > 0) { // Render globalVectors
			ctx.beginPath();
			for (let i = 0; i < globalVectors.length; i++) {
				let point = globalVectors[i].position;
				let vector = globalVectors[i].vector;
				ctx.moveTo(point.x, point.y);
				ctx.lineTo(point.x + vector.x * 10 / camera.scale, point.y + vector.y * 10 / camera.scale);
				ctx.strokeStyle = "#FFAB2E";
				ctx.lineWidth = 3 / camera.scale;
			}
			ctx.stroke();
		}
	}
	centers() {
		const { ctx, Game } = this;
		const { camera } = Game.Render;
		ctx.fillStyle = "#FF832A";
		let allBodies = Game.World.bodies;
		ctx.beginPath();
		for (let body of allBodies) {
			if (body.children.size === 0 || true) {
				ctx.moveTo(body.position.x, body.position.y);
				ctx.arc(body.position.x, body.position.y, 2 / camera.scale, 0, Math.PI*2);
			}
		}
		ctx.fill();
	}
	boundingBox() {
		const { ctx, Game } = this;
		const { World, Render } = Game;
		const { camera } = Render;
		let allBodies = World.bodies;
		let allConstraints = World.constraints;

		ctx.strokeStyle = "#66666680";
		ctx.lineWidth = 1 / camera.scale;

		for (let body of allBodies) {
			if (!body.children || body.children.size === 0) {
				let bounds = body.bounds;
				let width  = bounds.max.x - bounds.min.x;
				let height = bounds.max.y - bounds.min.y;

				ctx.beginPath();
				ctx.strokeRect(bounds.min.x, bounds.min.y, width, height);
			}
		}
		ctx.strokeStyle = "#66666630";
		for (let constraint of allConstraints) {
			let bounds = constraint.bounds;
			let width  = bounds.max.x - bounds.min.x;
			let height = bounds.max.y - bounds.min.y;

			ctx.beginPath();
			ctx.strokeRect(bounds.min.x, bounds.min.y, width, height);
		}
	}
	broadphase(tree = this.Game.World.dynamicGrid) {
		const { ctx, Game } = this;
		const { camera } = Game.Render;
		let size = tree.gridSize;

		ctx.lineWidth = 0.4 / camera.scale;
		ctx.strokeStyle = "#D0A356";
		ctx.fillStyle = "#947849";
		
		Object.keys(tree.grid).forEach(n => {
			let node = tree.grid[n];
			let pos = tree.unpair(n).mult(size);
			ctx.strokeRect(pos.x, pos.y, size, size);
			ctx.globalAlpha = 0.003 * node.length;
			ctx.fillRect(pos.x, pos.y, size, size);
			ctx.globalAlpha = 1;
		});
	}
}


/***/ }),

/***/ "./src/render/PerformanceRender.js":
/*!*****************************************!*\
  !*** ./src/render/PerformanceRender.js ***!
  \*****************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const RenderMethods = __webpack_require__(/*! ../render/RenderMethods */ "./src/render/RenderMethods.js");

/**
 * Handles rendering performance stats
 * @class PerformanceRender
 */
module.exports = class PerformanceRender {
	enabled = false;
	canvas = null;
	ctx = null;
	position = new vec(20, 20);
	constructor(Performance, Render) {
		this.Performance = Performance;

		// Create canvas
		const width  = this.width  = 100;
		const height = this.height = 50;
		let scale = this.scale = devicePixelRatio ?? 1;
		let canvas = this.canvas = document.createElement("canvas");
		this.ctx = canvas.getContext("2d");
		canvas.style.position = "absolute";
		canvas.style.zIndex = 2;
		canvas.style.top =  "20px";
		canvas.style.right = "0px";
		canvas.style.left = "unset";
		canvas.width =  scale * width;
		canvas.height = scale * height;
		canvas.style.background = "transparent";
		canvas.style.pointerEvents = "none";
		canvas.style.transformOrigin = "top left";
		canvas.style.transform = `scale(${1 / scale}, ${1 / scale})`;
		document.body.appendChild(canvas);

		// Set up rendering
		this.update = this.update.bind(this);
		Render.app.ticker.add(this.update);
	}
	update() {
		let { canvas, ctx, enabled, Performance, scale, width, height } = this;
		let { history } = Performance;

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		if (enabled) {
			ctx.save();
			ctx.scale(scale, scale);

			// background
			ctx.beginPath();
			RenderMethods.roundedRect(width, height, new vec(width/2, height/2), 5, ctx);
			ctx.fillStyle = "#0D0D0De6";
			ctx.fill();


			// get fps stats
			let maxFps = 0;
			let minFps = Infinity;
			let avgFps = (() => {
				let v = 0;
				for (let i = 0; i < history.fps.length; i++) {
					let cur = history.fps[i];
					v += cur;
					maxFps = Math.max(maxFps, cur);
					minFps = Math.min(minFps, cur);
				}
				return v / history.fps.length;
			})();
			let nearAvgFps = (() => {
				let v = 0;
				let n = Math.min(history.fps.length, 20);
				for (let i = 0; i < n; i++) {
					let cur = history.fps[i];
					v += cur;
				}
				return v / n;
			})();

			// fps text
			ctx.beginPath();
			ctx.fillStyle = "white";
			ctx.textAlign = "right";
			ctx.font = `400 ${12}px Arial`;
			ctx.fillText(`${Math.round(nearAvgFps)} fps`, width - 12, 5 + 12);

			
			if (history.fps.length > 10) { // fps graph
				let range = 100;
				let fpsRanges = {
					min: Math.max(0, Math.min(minFps, avgFps - range)),
					max: Math.max(maxFps, avgFps + range, 60),
				}
				const fpsRange = fpsRanges.max - fpsRanges.min;
				let bounds = {
					min: new vec(10, 18),
					max: new vec(width - 10, height - 4),
				};

				ctx.beginPath();
				function getPosition(point, i) {
					let x = bounds.max.x - (i / history.fps.length) * (bounds.max.x - bounds.min.x);
					let y = bounds.max.y - ((point - fpsRanges.min) / fpsRange) * (bounds.max.y - bounds.min.y);
					return [x, y];
				}
				ctx.moveTo(...getPosition(history.fps[0], 0))
				for (let i = 1; i < history.fps.length; i++) {
					ctx.lineTo(...getPosition(history.fps[i], i));
				}
				ctx.lineWidth = 1;
				ctx.lineJoin = "bevel";
				ctx.strokeStyle = "#9C9C9C";
				ctx.stroke();
			}

			// colored rect
			ctx.beginPath();
			let colors = [[0.75, "#3FF151"], [0.5, "#F5ED32"], [0.25, "#F89A2C"], [0, "#F74D4D"]];
			let boundMax = 60;
			ctx.fillStyle = "#808080";
			for (let color of colors) {
				if (avgFps >= color[0] * boundMax) {
					ctx.fillStyle = color[1];
					break;
				}
			}
			RenderMethods.roundedRect(6, 6, new vec(15, 13), 2, ctx);
			ctx.fill();
			
			
			ctx.restore();
		}
	}
}


/***/ }),

/***/ "./src/render/PolygonRender.js":
/*!*************************************!*\
  !*** ./src/render/PolygonRender.js ***!
  \*************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const Node = __webpack_require__(/*! ../node/Node.js */ "./src/node/Node.js");
const vec = __webpack_require__(/*! ../geometry/vec.js */ "./src/geometry/vec.js");
const Common = __webpack_require__(/*! ../core/Common.js */ "./src/core/Common.js");

/**
 * @class PolygonRender
 * @extends Node
 * @description A polygon render object
 */
module.exports = class PolygonRender extends Node {
	static defaultOptions = {
		container: null, // {PIXI Container}
		layer: 0, // {Number}
		position: new vec(0, 0), // {vec}
		angle: 0, // {Number} [0, 2PI]
		subtype: "polygon", // "polygon" | "rectangle" | "circle"
		vertices: [],

		visible: true,
		alpha: 1,
		background: "transparent",
		border: "transparent",
		borderWidth: 3,
		borderOffset: 0.5,
		lineCap: "butt",
		lineJoin: "miter",
		
		// subtype: "rectangle" only options
		width: 100,
		heigth: 100,
		round: 0,

		// subtype: "circle" only options
		radius: 50,
	}
	static all = new Set();
	nodeType = "PolygonRender";
	constructor(options = {}) {
		super();
		let defaults = { ...PolygonRender.defaultOptions };
		Common.merge(defaults, options, 1);
		options = defaults;
		Common.merge(this, options, 1);

		this.create();
	}
	create() {
		let graphic = this.graphic = new PIXI.Graphics();
		let { position, angle, subtype, vertices } = this;
		let { layer, alpha, background, border, borderWidth, lineCap, lineJoin, borderOffset, round } = this;
		let { parseColor } = Common;
		
		background = parseColor(background);
		if (background[1] > 0) graphic.beginFill(...background);

		border = parseColor(border);
		if (border[1] > 0) {
			graphic.lineStyle({
				width: borderWidth,
				color: border[0],
				alpha: border[1],
				cap: lineCap,
				join: lineJoin,
				alignment: borderOffset,
			});
		}

		if (subtype === "rectangle") {
			let { width, height } = this;
			
			if (round > 0) {
				graphic.drawRoundedRect(-width/2, -height/2, width, height, round);
			}
			else {
				graphic.drawRect(-width/2, -height/2, width, height);
			}
		}
		else if (subtype === "circle") {
			let { radius } = this;
			graphic.drawCircle(0, 0, radius);
		}
		else { // manually draw vertices
			let center = Common.getCenterOfMass(vertices);
			graphic.drawPolygon(vertices.map(vertice => vertice.sub(center)));
			// graphic.drawPolygon(vertices);
		}
		if (border[1] > 0) graphic.closePath();
		if (background[1] > 0) graphic.endFill();
		graphic.zIndex = layer;

		// Translate to position
		let translateDelta = new vec(position);
		this.position = new vec(0, 0);
		this.translate(translateDelta);

		// Rotate to angle
		this.angle = 0;
		this.translateAngle(angle);

		// Set alpha
		this.setAlpha(alpha);

		// Trigger events
		this.trigger("load");
	}

	/**
	 * Sets the render layer (z index)
	 * @param {Number} layer - The render layer (z index) for the render
	 */
	setLayer(layer) {
		this.layer = layer;
		this.graphic.zIndex = layer;
	}

	/**
	 * Sets the render's alpha
	 * @param {Number} alpha - The opacity, between 0 and 1 inclusive
	 */
	setAlpha(alpha) {
		this.alpha = alpha;
		this.graphic.alpha = alpha;
	}

	/**
	 * Changes if the render is visible
	 * @param {Boolean} visible - If the render is visible
	 */
	setVisible(visible) {
		this.visible = visible;
		this.graphic.visible = visible;
	}

	/**
	 * Shifts the render's position by `delta`
	 * @param {vec} delta - Position render is shifted
	 */
	translate(delta) {
		super.translate(delta);

		let { graphic } = this;
		graphic.position.x += delta.x;
		graphic.position.y += delta.y;
	}

	/**
	 * Rotates the render relative to current angle
	 * @param {Number} angle - Amount to rotate render, in radians
	 */
	translateAngle(angle) {
		let { graphic } = this;
		this.angle += angle;
		graphic.rotation += angle;
	}

	/**
	 * Adds the render object to the world
	 */
	add() {
		super.add();
		PolygonRender.all.add(this);
		this.container.addChild(this.graphic);
	}
	/**
	 * Removes the render object from the world
	 */
	delete() {
		super.delete();
		PolygonRender.all.delete(this);
		this.container.removeChild(this.graphic);
	}
	
	/**
	 * Destroys the render object. Use when you know the render will no longer be used
	 */
	destroy() {
		this.graphic.destroy();
	}

	#events = {
		delete: [],
		add: [],
		load: [],
	}
}


/***/ }),

/***/ "./src/render/Render.js":
/*!******************************!*\
  !*** ./src/render/Render.js ***!
  \******************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const Camera = __webpack_require__(/*! ../render/Camera.js */ "./src/render/Camera.js");
const Common = __webpack_require__(/*! ../core/Common.js */ "./src/core/Common.js");
const vec = __webpack_require__(/*! ../geometry/vec.js */ "./src/geometry/vec.js");

/**
 * Main render object that handles the camera, pixel ratio, resizing, what is rendered, etc
 * @class Render
 */
module.exports = class Render {
	static defaultOptions = {
		background: false,
		pixelRatio: window.devicePixelRatio ?? 1,
		ySort: false,
		resizeTo: window,
		antialias: true,
		getBoundSize: function(width, height) {
			return Math.sqrt(width ** 2 + height ** 2) || 1;
		}
	}
	app = null;
	camera = null;
	pixelRatio = 1;
	nodes = new Set();
	constructor(options = {}) {
		// Test if PIXI is loaded
		try { PIXI.settings; }
		catch(err) {
			throw new Error("PIXI is not defined\nHelp: try loading pixi.js before creating a ter app");
		}

		// Load options
		let defaults = { ...Render.defaultOptions };
		let resizeTo = options.resizeTo ?? defaults.resizeTo;
		delete options.resizeTo;
		Common.merge(defaults, options, 1);
		options = defaults;
		let { background, ySort, pixelRatio, antialias, getBoundSize } = options;

		// Create camera
		this.camera = new Camera();

		// Setup bound size
		this.getBoundSize = getBoundSize;

		// Set basic settings
		let scale = PIXI.settings.RESOLUTION = PIXI.settings.FILTER_RESOLUTION = this.pixelRatio = pixelRatio;
		PIXI.Container.defaultSortableChildren = true
		
		// Create PIXI app
		let app = this.app = new PIXI.Application({
			background: background ?? 0x0,
			backgroundAlpha: (background && background != "transparent") ? 1 : 0,
			resizeTo: resizeTo ?? window,
			antialias: antialias ?? true,
		});
		document.body.appendChild(app.view);
		app.ticker.add(this.update.bind(this)); // Start render
		app.stage.filters = []; // Makes working with pixi filters easier
		app.stage.sortableChildren = true; // Important so render layers work

		// Set up pixel ratio scaling
		let view = app.view;
		view.style.transformOrigin = "top left";
		view.style.transform = `scale(${1 / scale}, ${1 / scale})`;

		// Make sure canvas stays correct size
		this.setSize(app.screen.width, app.screen.height);
		app.renderer.on("resize", this.setSize.bind(this));

		// Set up y sorting if enabled
		if (ySort) {
			app.stage.on("sort", function beforeSort(sprite) {
				sprite.zOrder = sprite.y;
			});
		}
	}
	setSize(width, height) {
		let pixelRatio = this.pixelRatio;
		this.camera.boundSize = this.getBoundSize(width, height) * pixelRatio;
	}
	setPixelRatio(pixelRatio) {
		this.pixelRatio = pixelRatio;
		this.setSize(this.app.screen.width, this.app.screen.height); // update bounds with new pixel ratio
	}

	/**
	 * Adds all `children` to this Render
	 * @param {...Renderable} children - The children to be added
	 */
	addChild(...children) {
		for (let child of children) {
			this.nodes.add(child);
		}
	}
	/**
	 * Removes all `children` from this Render
	 * @param {...Renderable} children - The children to be removed
	 */
	removeChild(...children) {
		for (let child of children) {
			this.nodes.delete(child);
		}
	}

	/**
	 * Updates renderer, its camera, and all render nodes attached to it. Triggers `beforeUpdate` and `afterUpdate` events on this Render. Also triggers `render` on nodes
	 */
	update() {
		this.trigger("beforeUpdate");

		let { app, camera } = this;
		let { stage } = app;
		let { position: cameraPosition, translation, fov, boundSize } = camera;
		
		let screenSize = new vec(app.screen.width, app.screen.height);
		translation.set({ x: -cameraPosition.x * boundSize/fov + screenSize.x/2, y: -cameraPosition.y * boundSize/fov + screenSize.y/2 });
		camera.scale = boundSize / fov;

		for (let node of this.nodes) {
			if (node.render.graphic) {
				node.render.graphic.update();
				node.trigger("render");
			}
		}
		
		// update camera position
		stage.x = translation.x;
		stage.y = translation.y;
		stage.scale.x = camera.scale;
		stage.scale.y = camera.scale;

		this.trigger("afterUpdate");
	}

	// - Events
	#events = {
		beforeUpdate: [],
		afterUpdate: [],
	}
	on(event, callback) {
		if (this.#events[event]) {
			this.#events[event].push(callback);
		}
		else {
			console.warn(event + " is not a valid event");
		}
	}
	off(event, callback) {
		event = this.#events[event];
		if (event.includes(callback)) {
			event.splice(event.indexOf(callback), 1);
		}
	}
	trigger(event) {
		// Trigger each event
		if (this.#events[event]) {
			this.#events[event].forEach(callback => {
				callback();
			});
		}
	}
}


/***/ }),

/***/ "./src/render/RenderMethods.js":
/*!*************************************!*\
  !*** ./src/render/RenderMethods.js ***!
  \*************************************/
/***/ ((module) => {

let RenderMethods = module.exports = {
	// ~ Point transformations
	screenPtToGame: function(point, Render) {
		const { camera, pixelRatio } = Render;
		const { scale, translation } = camera;
		return new vec((point.x * pixelRatio - translation.x) / scale, (point.y * pixelRatio - translation.y) / scale);
	},
	gamePtToScreen: function(point, Render) {
		const { camera, pixelRatio } = Render;
		const { scale, translation } = camera;
		return new vec((point.x * scale + translation.x) / pixelRatio, (point.y * scale + translation.y) / pixelRatio);
	},
	roundedPolygon: function(vertices, round, graphic) {
		if (vertices.length < 3) {
			console.warn("RenderMethods.roundedPolygon needs at least 3 vertices", vertices);
			return;
		}
		function getPoints(i) {
			let curPt = vertices[i];
			let lastPt = vertices[(vertices.length + i - 1) % vertices.length];
			let nextPt = vertices[(i + 1) % vertices.length];

			let lastDiff = lastPt.sub(curPt);
			let nextDiff = curPt.sub(nextPt);
			let lastLen = lastDiff.length;
			let nextLen = nextDiff.length;

			let curRound = Math.min(lastLen / 2, nextLen / 2, round);
			let cp = curPt;
			let pt1 = cp.add(lastDiff.normalize().mult(curRound));
			let pt2 = cp.sub(nextDiff.normalize().mult(curRound));

			return [pt1, cp, pt2];
		}

		let start = getPoints(0);
		graphic.moveTo(start[0].x, start[0].y);
		graphic.quadraticCurveTo(start[1].x, start[1].y, start[2].x, start[2].y);

		for (let i = 1; i < vertices.length; i++) {
			let cur = getPoints(i);
			graphic.lineTo(cur[0].x, cur[0].y);
			graphic.quadraticCurveTo(cur[1].x, cur[1].y, cur[2].x, cur[2].y);
		}

		graphic.lineTo(start[0].x, start[0].y);
	},
	roundedPolygonCtx: function(vertices, round, ctx) {
		if (vertices.length < 3) {
			console.warn("RenderMethods.roundedPolygon needs at least 3 vertices", vertices);
			return;
		}
		function getPoints(i) {
			let curPt = vertices[i];
			let lastPt = vertices[(vertices.length + i - 1) % vertices.length];
			let nextPt = vertices[(i + 1) % vertices.length];

			let lastDiff = lastPt.sub(curPt);
			let nextDiff = curPt.sub(nextPt);
			let lastLen = lastDiff.length;
			let nextLen = nextDiff.length;

			let curRound = Math.min(lastLen / 2, nextLen / 2, round);
			let cp = curPt;
			let pt1 = cp.add(lastDiff.normalize().mult(curRound));
			let pt2 = cp.sub(nextDiff.normalize().mult(curRound));

			return [pt1, cp, pt2];
		}

		let start = getPoints(0)
		ctx.moveTo(start[0].x, start[0].y);
		ctx.quadraticCurveTo(start[1].x, start[1].y, start[2].x, start[2].y);

		for (let i = 1; i < vertices.length; i++) {
			let cur = getPoints(i);
			ctx.lineTo(cur[0].x, cur[0].y);
			ctx.quadraticCurveTo(cur[1].x, cur[1].y, cur[2].x, cur[2].y);
		}

		ctx.closePath();
	},
	roundedRect: function(width, height, position, round, ctx) {
		RenderMethods.roundedPolygonCtx([
			new vec(-width/2, -height/2).add2(position),
			new vec( width/2, -height/2).add2(position),
			new vec( width/2,  height/2).add2(position),
			new vec(-width/2,  height/2).add2(position),
		], round, ctx);
	},
	arrow: function(position, direction, size = 10, ctx) {
		let endPos = new vec(position.x + direction.x, position.y + direction.y);
		let sideA = direction.rotate(Math.PI * 3/4).normalize2().mult(size);
		let sideB = sideA.reflect(direction.normalize());

		ctx.moveTo(position.x, position.y);
		ctx.lineTo(endPos.x, endPos.y);
		ctx.lineTo(endPos.x + sideA.x, endPos.y + sideA.y);
		ctx.moveTo(endPos.x, endPos.y);
		ctx.lineTo(endPos.x + sideB.x, endPos.y + sideB.y);
	},
}


/***/ }),

/***/ "./src/render/RenderTypes.js":
/*!***********************************!*\
  !*** ./src/render/RenderTypes.js ***!
  \***********************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

let Render = module.exports;

Render.Polygon = __webpack_require__(/*! ../render/PolygonRender */ "./src/render/PolygonRender.js");
Render.Sprite = __webpack_require__(/*! ../render/Sprite */ "./src/render/Sprite.js");


/***/ }),

/***/ "./src/render/Sprite.js":
/*!******************************!*\
  !*** ./src/render/Sprite.js ***!
  \******************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const Common = __webpack_require__(/*! ../core/Common.js */ "./src/core/Common.js");
const Node = __webpack_require__(/*! ../node/Node.js */ "./src/node/Node.js");
const vec = __webpack_require__(/*! ../geometry/vec.js */ "./src/geometry/vec.js");

// todo: load all sprites when game is loaded
// todo: properly delete sprites when bodies no longer used

/**
 * @class Sprite
 * @extends Node
 * A sprite render object
 */
module.exports = class Sprite extends Node {
	static imageDir = "./img/";
	static defaultOptions = {
		container: null, // {PIXI Container}
		layer: 0, // {Number}
		position: new vec(0, 0), // {vec}
		angle: 0, // {Number} [0, 2PI]

		visible: true,
		alpha: 1,
		src: "",
		
		scale: new vec(1, 1),
		width:  undefined,
		heigth: undefined,
	}
	static all = new Set();

	loaded = false;
	nodeType = "Sprite";
	constructor(options) {
		super();
		let defaults = { ...Sprite.defaultOptions };
		Common.merge(defaults, options, 1);
		options = defaults;
		Common.merge(this, options, 1);

		this.src = Sprite.imageDir + this.src;
		this.position = new vec(this.position ?? { x: 0, y: 0 });
		this.add = this.add.bind(this);

		this.create();
	}
	create() {
		let { width, height, layer, position, angle, src } = this;
		let sprite = this.sprite = PIXI.Sprite.from(src);
		this.loaded = true;
		sprite.anchor.set(0.5);

		if (width != undefined && height != undefined) {
			this.setSize(width, height);
		}

		// Update alpha
		this.setAlpha(this.alpha);

		// Update layer
		this.setLayer(layer);

		// Translate to position
		let translateDelta = new vec(position);
		this.position.set(new vec(0, 0));
		this.translate(translateDelta);
		
		// Rotate to angle
		this.angle = 0;
		this.translateAngle(angle);

		
		this.trigger("load");
	}
	
	/**
	 * Sets the render layer (z index)
	 * @param {Number} layer - The render layer (z index) for the render
	 */
	setLayer(layer) {
		this.layer = layer;
		if (!this.loaded) return;
		this.sprite.zIndex = layer;
	}

	/**
	 * Sets the sprite's scale
	 * @param {vec} scale - The new scale
	 */
	setScale(scale) {
		this.scale.set(scale);

		if (!this.loaded) return;
		let { sprite } = this;
		sprite.scale.x = this.scale.x;
		sprite.scale.y = this.scale.y;
	}

	/**
	 * Sets the sprite's width and height
	 * @param {Number} width - The new width
	 * @param {Number} height - The new height
	 */
	setSize(width, height) {
		if (width != undefined) this.width = width;
		if (height != undefined) this.height = height;

		if (!this.loaded) return;
		let { sprite } = this;
		sprite.width =  this.width;
		sprite.height = this.height;
	}

	/**
	 * Sets the sprite's alpha
	 * @param {Number} alpha - The opacity, between 0 and 1 inclusive
	 */
	setAlpha(alpha) {
		this.alpha = alpha;
		if (!this.loaded) return;
		this.sprite.alpha = alpha;
	}

	/**
	 * Changes if the sprite is visible
	 * @param {Boolean} visible - If the sprite is visible
	 */
	setVisible(visible) {
		this.visible = visible;
		if (!this.loaded) return;
		this.sprite.visible = visible;
	}

	/**
	 * Shifts the sprite's position by `delta`
	 * @param {vec} delta - Amount sprite is shifted by
	 */
	translate(delta) {
		super.translate(delta);

		if (!this.loaded) return;
		let { sprite } = this;
		sprite.position.x += delta.x;
		sprite.position.y += delta.y;
	}
	
	/**
	 * Rotates the sprite relative to current angle
	 * @param {Number} angle - Amount to rotate sprite, in radians
	 */
	translateAngle(angle) {
		super.translateAngle(angle);

		if (!this.loaded) return;
		let { sprite } = this;
		sprite.rotation += angle;
	}

	/**
	 * Adds the sprite to the world
	 */
	add() {
		if (!this.sprite && this.added) {
			this.on("load", this.add);
			return;
		}

		super.add();
		Sprite.all.add(this);
		this.container.addChild(this.sprite);
	}
	
	/**
	 * Removes the sprite from the world
	 */
	delete() {
		super.delete();
		Sprite.all.delete(this);
		this.container.removeChild(this.sprite);
		
		this.off("load", this.add);
	}
	
	/**
	 * Destroys the sprite. Use when you know the sprite will no longer be used
	 */
	destroy() {
		this.sprite.destroy();
	}


	#events = {
		load: [],
		add: [],
		delete: [],
	}
}


/***/ }),

/***/ "./src/ter.js":
/*!********************!*\
  !*** ./src/ter.js ***!
  \********************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

let ter = module.exports;

ter.Performance = __webpack_require__(/*! ./core/Performance */ "./src/core/Performance.js");
ter.Game = __webpack_require__(/*! ./core/Game */ "./src/core/Game.js");
ter.Common = __webpack_require__(/*! ./core/Common */ "./src/core/Common.js");
ter.Ticker = __webpack_require__(/*! ./core/Ticker */ "./src/core/Ticker.js");


ter.Node = __webpack_require__(/*! ./node/Node */ "./src/node/Node.js");
ter.World = __webpack_require__(/*! ./node/World */ "./src/node/World.js");

ter.Engine = __webpack_require__(/*! ./physics/Engine */ "./src/physics/Engine.js");
ter.Bodies = __webpack_require__(/*! ./bodies/Bodies */ "./src/bodies/Bodies.js");

ter.Render = __webpack_require__(/*! ./render/RenderTypes */ "./src/render/RenderTypes.js");

vec = __webpack_require__(/*! ./geometry/vec */ "./src/geometry/vec.js");
ter.Grid = __webpack_require__(/*! ./geometry/Grid */ "./src/geometry/Grid.js");
ter.Bezier = __webpack_require__(/*! ./geometry/Bezier */ "./src/geometry/Bezier.js");
ter.Bounds = __webpack_require__(/*! ./geometry/Bounds */ "./src/geometry/Bounds.js");

ter.simplexNoise = __webpack_require__(/*! ./lib/simplexNoise */ "./src/lib/simplexNoise.js");
ter.polyDecomp = __webpack_require__(/*! ./lib/poly-decomp */ "./src/lib/poly-decomp.js");

ter.BehaviorTree = __webpack_require__(/*! ./behaviorTree/BehaviorTree */ "./src/behaviorTree/BehaviorTree.js");
ter.Functions = __webpack_require__(/*! ./extra/GameFunctions */ "./src/extra/GameFunctions.js");


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./src/ter.js");
/******/ 	
/******/ 	return __webpack_exports__;
/******/ })()
;
});
//# sourceMappingURL=ter.js.map