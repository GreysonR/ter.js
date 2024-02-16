"use strict";

const vec = require("../geometry/vec.js");

module.exports = class Node {
	position = new vec(0, 0);
	parent = null;
	children = [];

	/**
	 * Sets the node's position to `position`
	 * 
	 * @param {ter.vec} position - Position the node should be set to
	 */
	setPosition(position) {
		let delta = position.sub(this.position);
		this.translate(delta);
	}

	/**
	 * Shifts the nodes position by `positionDelta`
	 * 
	 * @param {ter.vec} positionDelta - Amount to shift the position
	 */
	translate(positionDelta) {
		this.position.add2(positionDelta);
		for (let child of this.children) {
			child.translate(delta);
		}
	}
}
