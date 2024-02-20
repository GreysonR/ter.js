"use strict";

const vec = require("../geometry/vec.js");
const Common = require("../core/Common.js");

/**
 * A generic node object
 */
class Node {
	static id = 0;
	/**
	 * Generates a unique id for nodes
	 * @return {number} A unique integer id
	*/
	static getUniqueId() {
		return ++Node.id;
	}
	
	/**
	 * Position
	 * @type {vec}
	 * @readonly
	 * @todo Implement getPosition method and make this private
	 */
	position = new vec(0, 0);
	/**
	 * Angle, in radians
	 * @type {number}
	 * @readonly
	 * @todo Implement getAngle method and make this private
	 */
	angle = 0;
	/**
	 * Children of the node.
	 * To modify, use `addChild()` or `removeChild`.
	 * @readonly
	 * @type {Set}
	 */
	children = new Set();
	/**
	 * If the node is added to the game world. 
	 * To modify, use `add()` or `delete()`.
	 * @type {boolean}
	 */
	#added = false;
	
	/**
	 * Creates a Node
	 */
	constructor() {
		this.id = Node.getUniqueId();
	}
	
	/**
	 * Adds this node and its children
	 */
	add() {
		if (!this.#added) {
			this.trigger("add");
			this.#added = true;

			for (let child of this.children) {
				child.add();
			}
		}
	}
	/**
	 * Removes this node and its children
	 */
	delete() {
		if (this.#added) {
			this.trigger("delete");
			this.#added = false;
	
			for (let child of this.children) {
				child.delete();
			}
		}
	}

	isAdded() {
		return this.#added;
	}

	/**
	 * Adds all `children` to this node's children
	 * @param {...Node} children - Children added
	 * @example
	 * let parentNode = new Node();
	 * let childNode = new Node();
	 * node.addChild(childNode);
	 */
	addChild(...children) {
		for (let child of children) {
			this.children.add(child);
		}
	}
	/**
	 * Removes all `children` from this node's children
	 * @param {...Node} children - Children removed
	 * @example
	 * let parentNode = new Node();
	 * let childNode = new Node();
	 * node.addChild(childNode); // node.children: Set {childNode}
	 * node.removeChild(childNode); // node.children: Set {}
	 */
	removeChild(...children) {
		for (let child of children) {
			this.children.delete(child);
		}
	}
	
	/**
	 * Sets this node's position to `position`
	 * @example
	 * node.setPosition(new vec(100, 100)); // Sets node's position to (100, 100) 
	 * @param {vec} position - Position the node should be set to
	*/
	setPosition(position) {
		let delta = position.sub(this.position);
		this.translate(delta);
	}
	/**
	 * Shifts this node's position by `positionDelta`
	 * @param {vec} positionDelta - Amount to shift the position
	 */
	translate(positionDelta) {
		this.position.add2(positionDelta);
		for (let child of this.children) {
			child.translate(positionDelta);
		}
	}
	
	/**
	 * Sets the node's angle to `angle`
	 * @param {number} angle - Angle body should be in radians
	 * @example
	 * node.setAngle(Math.PI); // Sets node's angle to Pi radians, or 180 degrees
	 */
	setAngle(angle) {
		if (isNaN(angle)) return;
		if (angle !== this.angle) {
			let delta = Common.angleDiff(angle, this.angle);
			this.translateAngle(delta);
		}
	}
	
	/**
	 * Rotates the body by `angle`- Relative
	 * @param {number} angle -Amount the body should be rotated, in radians
	 */
	translateAngle(angle) {
		if (isNaN(angle)) return;

		this.angle += angle;

		for (let child of this.children) {
			child.translateAngle?.(angle);
		}
	}

	
	#events = {
		delete: [],
		add: [],
	}
	/**
	 * Bind a callback to an event
	 * @param {string} event - Name of the event
	 * @param {Function} callback - Callback run when event is fired
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
	 * Unbinds a callback from an event
	 * @param {string} event - Name of the event
	 * @param {Function} callback - Function to unbind
	 */
	off(event, callback) {
		let events = this.#events[event];
		if (events.includes(callback)) {
			events.splice(events.indexOf(callback), 1);
		}
	}
	/**
	 * Triggers an event, firing all bound callbacks
	 * @param {string} event - Name of the event
	 * @param {...*} args - Arguments passed to callbacks
	 */
	trigger(event, ...args) {
		// Trigger each event
		if (this.#events[event]) {
			this.#events[event].forEach(callback => {
				callback(...args);
			});
		}
	}
}
module.exports = Node;
