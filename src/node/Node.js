"use strict";

const vec = require("../geometry/vec.js");

module.exports = class Node {
	static id = 0;
	/**
	 * Generates a unique id for nodes
	 * @returns {Number} A unique integer id
	 */
	static getUniqueId() {
		return ++Node.id;
	}

	position = new vec(0, 0);
	angle = 0;
	children = new Set();
	added = false;

	/**
	 * Creates a Node
	 */
	constructor() {
		this.id = Node.getUniqueId();
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
			child.translate(delta);
		}
	}
	
	/**
	 * Sets the node's angle to `angle`
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
	 * Rotates the body by `angle`- Relative
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
	 * Adds this node and its children
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
	 * Removes this node and its children
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
	 * Adds all `children` to this node's children
	 * @param {...Node} children - The child nodes to be added
	 */
	addChild(...children) {
		for (let child of children) {
			this.children.add(child);
		}
	}
	/**
	 * Removes all `children` from this node's children
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
