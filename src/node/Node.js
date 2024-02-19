"use strict";

const vec = require("../geometry/vec.js");

/**
 * @class Node
 * @description Generic node object
 */
module.exports = class Node {
	static id = 0;
	/**
	 * @memberof Node
	 * @description Generates a unique id for nodes
	 * @returns number A unique integer id
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
	 * @param number angle - Angle body should be in radians
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
	 * @param number angle - The amount the body should be rotated, in radians
	 * @param {boolean} silent - If the body's angle should be affected
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
	 * @param string event - The name of the event
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
	 * @param string event - The name of the event
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
	 * @param string event - Name of the event
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
