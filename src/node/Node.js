"use strict";

const vec = require("../geometry/vec.js");
const Common = require("../core/Common.js");

/**
 * A generic node object
 * ## Events
 * | Name | Description | Arguments |
 * | ---- | ----------- | --------- |
 * | add | Node is added to the world | None |
 * | delete | Node is removed from the world | None |
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
	 * Type of node, ie `Node` or `RigidBody`
	 * @readonly
	 */
	nodeType = "Node";

	/**
	 * Position of the node
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
	 * Children of the node
	 * To modify, use `addChild()` or `removeChild`.
	 * @readonly
	 * @type {Set}
	 */
	children = new Set();
	/**
	 * If the node is added to the game world. 
	 * @private
	 * @type {boolean}
	 */
	#added = false;
	
	/**
	 * Creates a Node with the given position
	 */
	constructor(position = new vec(0, 0)) {
		this.id = Node.getUniqueId();
		this.position = new vec(position);
	}
	
	/**
	 * Adds this node and its children, triggering the `add` event
	 * @returns {Node} `this`
	 */
	add() {
		if (!this.#added) {
			this.trigger("add");
			this.#added = true;

			for (let child of this.children) {
				child.add();
			}
		}
		return this;
	}
	/**
	 * Removes this node and its children, triggering the `delete` event
	 * @returns {Node} `this`
	 */
	delete() {
		if (this.#added) {
			this.trigger("delete");
			this.#added = false;
	
			for (let child of this.children) {
				child.delete();
			}
		}
		return this;
	}

	/**
	 * Gets if the node is added
	 * @returns {Boolean} if the node is added
	 */
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
		if (!position instanceof vec) throw new Error("position must be a vec");
		let delta = position.sub(this.position);
		this.translate(delta);
	}
	/**
	 * Shifts this node's position by `positionDelta`
	 * @param {vec} positionDelta - Amount to shift the position
	 */
	translate(positionDelta) {
		if (!positionDelta instanceof vec) throw new Error("positionDelta must be a vec");
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
	setAngle(angle, pivot = this.position) {
		if (isNaN(angle)) return;
		if (angle !== this.angle) {
			let delta = Common.angleDiff(angle, this.angle);
			this.translateAngle(delta, pivot);
		}
	}
	
	/**
	 * Rotates the body by `angle`- Relative
	 * @param {number} angle -Amount the body should be rotated, in radians
	 */
	translateAngle(angle, pivot = this.position, pivotPosition = true) {
		if (isNaN(angle)) return;

		this.angle += angle;

		if (pivotPosition) {
			let sin = Math.sin(angle);
			let cos = Math.cos(angle);
			let dist = this.position.sub(pivot);
			let newPosition = new vec((dist.x * cos - dist.y * sin), (dist.x * sin + dist.y * cos)).add(pivot);
			this.setPosition(newPosition);
		}

		for (let child of this.children) {
			child.translateAngle?.(angle, pivot);
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
