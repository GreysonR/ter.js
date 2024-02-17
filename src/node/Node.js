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
	 * Adds this node and its children
	 * @returns {void}
	 */
	add() {
		if (!this.added) {
			this.trigger("add");
			this.added = true;

			let children = this.children;
			for (let i in children) {
				children[i].add();
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
	
			let children = this.children;
			for (let i in children) {
				children[i].delete();
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
