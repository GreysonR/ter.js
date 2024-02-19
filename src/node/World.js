const Node = require("../node/Node.js");
const Common = require("../core/Common.js")
const Grid = require("../geometry/Grid.js");
const vec = require("../geometry/vec.js");
const RigidBody = require("../physics/RigidBody.js");

/**
 * The game world
 * @extends Node
 */
class World extends Node {
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
module.exports = World;
