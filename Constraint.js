
class Constraint {
	constructor(bodyA, bodyB, options = {}) {
		this.bodyA = bodyA;
		this.bodyB = bodyB;
		
		// Shallow copy render container
		if (options.render?.container) {
			this.render.container = options.render.container;
			delete options.render.container;
		}
		
		ter.Common.merge(this, options);
		if (!options.length) {
			this.length = bodyA.position.add(this.offsetA.rotate(bodyA.angle)).sub(bodyB.position.add(this.offsetB.rotate(bodyB.angle))).length;
		}
		this.type = "constraint";
		this.render.graphic = new RenderLine(this);
		this.updateBounds();
		this.add();
	}
	bounds = { min: new vec(), max: new vec() };
	delete() {
		this.removed = true;
		ter.World.constraints.delete(this);
		ter.Render.bodies.delete(this);
		if (this.render.graphic) {
			this.render.graphic.delete();
		}
		this.trigger("delete");
	}
	add() {
		this.removed = false;
		ter.World.constraints.push(this);
		ter.Render.bodies.add(this);
		if (this.render.graphic) {
			this.render.graphic.add();
		}
		this.trigger("add");
	}
	updateBounds() {
		let { pointA, pointB } = this.getPoints();
		this.bounds.min = pointA.min2(pointB);
		this.bounds.max = pointA.max2(pointB);
	}
	getPoints() {
		let { bodyA, bodyB, offsetA, offsetB } = this;
		offsetA = offsetA.rotate(bodyA.angle);
		offsetB = offsetB.rotate(bodyA.angle);

		let pointA = bodyA.position.add(offsetA);
		let pointB = bodyB.position.add(offsetB);

		return {
			pointA: pointA,
			pointB: pointB
		};
	}
	realLength() {
		let { pointA, pointB } = this.getPoints();
		return pointA.sub(pointB).length;
	}

	offsetA = new vec(0, 0);
	offsetB = new vec(0, 0);
	removed = true;
	stiffness = 0.1;
	angularStiffness = 0;
	ignoreSlack = false;
	length = 200;
	
	render = {
		border: "#ffffff",
		borderWidth: 10,
		borderType: "miter",
		lineCap: "round",
		lineJoin: "round",
		borderOffset: 0.5,
		visible: true,
		alpha: 1,
		layer: 0,
		graphic: null,
	}

	// Events
	events = {
		render: [],
		delete: [],
		add: [],
	}
	on(event, callback) {
		if (!this.events[event]) {
			this.events[event] = [];
		}
		this.events[event].push(callback);
	}
	off(event, callback) {
		event = this.events[event];
		if (event.includes(callback)) {
			event.splice(event.indexOf(callback), 1);
		}
	}
	trigger(event, arg1, arg2) {
		let events = this.events[event];
		for (let i = 0; i < events.length; i++) {
			events[i](arg1, arg2);
		}

		if (this.parent) {
			this.parent.trigger(event, arg1, arg2);
		}
	}
}
