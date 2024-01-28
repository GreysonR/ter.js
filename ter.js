"use strict";
var globalPoints = [];
var globalVectors = [];

var ter = {
	canvas: false,
	ctx: false,
	init: function(options) {
		// basic settings
		let scale = PIXI.settings.RESOLUTION = devicePixelRatio ?? 1;

		// create PIXI app
		let { Render } = ter;
		let app = Render.app = new PIXI.Application({
			background: options.background ?? 0x0,
			backgroundAlpha: (options.background && options.background != "transparent") ? 1 : 0,
			resizeTo: options.resizeTo ?? window,
			antialias: options.antialias ?? true,
		});
		document.body.appendChild(app.view);
		app.ticker.add(Render.update.bind(this));
		app.stage.filters = [];
		app.stage.sortableChildren = true

		let view = app.view;
		view.style.transformOrigin = "top left";
		view.style.transform = `scale(${1 / scale}, ${1 / scale})`;

		ter.setSize(app.screen.width, app.screen.height);
		app.renderer.on("resize", ter.setSize.bind(this));

		this.Performance.render.init();
	},
	setSize(width, height) {
		let pixelRatio = this.Render.pixelRatio;
		ter.Render.camera.boundSize = (Math.sqrt(width ** 2 + height ** 2) || 1) * pixelRatio;
	},
	Performance: {
		getAvgs: true,
		lastUpdate: performance.now(),
		fps: 60,
		delta: 1,
		frame: 0,

		history: {
			avgFps: 60,
			avgDelta: 1,
			fps: [],
			delta: [],
		},
		engine: {
			delta: 0,
			lastUpdate: 0,
		},
		
		update: function() {
			let Performance = ter.Performance;
			let curTime = performance.now();
			if (curTime - Performance.lastUpdate === 0) {
				return;
			}

			Performance.delta = Math.min(200, curTime - Performance.lastUpdate);
			Performance.fps = 1000 / Performance.delta;
			Performance.lastUpdate = curTime;

			if (!Performance.render.enabled && Performance.getAvgs) {
				Performance.history.fps.push(Performance.fps);
				Performance.history.delta.push(Performance.delta);
	
				if (Performance.history.fps.length > 100) {
					Performance.history.fps.shift();
					Performance.history.delta.shift();
				}
				let fps = (() => {
					let v = 0;
					for (let i = 0; i < Performance.history.fps.length; i++) {
						v += Performance.history.fps[i];
					}
					return v / Performance.history.fps.length;
				})();
				let delta = (() => {
					let v = 0;
					for (let i = 0; i < Performance.history.delta.length; i++) {
						v += Performance.history.delta[i];
					}
					return v / Performance.history.delta.length;
				})();

				Performance.history.avgFps = fps;
				Performance.history.avgDelta = delta;
			}
		},
		render: {
			enabled: false,
			canvas: null,
			ctx: null,
			position: new vec(20, 20),
			init: function() {
				const width =  100; // 90
				const height = 50; // 40

				let { Performance, Render } = ter;
				let { render } = Performance;
				let scale = devicePixelRatio ?? 1;

				let canvas = render.canvas = document.createElement("canvas");
				let ctx = render.ctx = canvas.getContext("2d");
				canvas.style.position = "absolute";
				canvas.style.zIndex = 2;
				canvas.style.top =  "20px";
				canvas.style.left = "20px";
				canvas.width =  scale * width;
				canvas.height = scale * height;
				canvas.style.background = "transparent";
				canvas.style.pointerEvents = "none";
				canvas.style.transformOrigin = "top left";
				canvas.style.transform = `scale(${1 / scale}, ${1 / scale})`;
				document.body.appendChild(canvas);

				Render.app.ticker.add((delta) => {
					ctx.clearRect(0, 0, canvas.width, canvas.height);
					if (render.enabled) {
						// update averages
						Performance.history.fps.push(Performance.fps);
						let maxLength = 200;
						while (Performance.history.fps.length > maxLength) {
							Performance.history.fps.shift();
						}

						ctx.save();
						ctx.scale(scale, scale);

						// background
						ctx.beginPath();
						Render.roundedRect(width, height, new vec(width/2, height/2), 5, ctx);
						ctx.fillStyle = "#0D0D0De6";
						ctx.fill();


						// get fps stats
						let maxFps = 0;
						let minFps = Infinity;
						let avgFps = (() => {
							let v = 0;
							for (let i = 0; i < Performance.history.fps.length; i++) {
								let cur = Performance.history.fps[i];
								v += cur;
								maxFps = Math.max(maxFps, cur);
								minFps = Math.min(minFps, cur);
							}
							return v / Performance.history.fps.length;
						})();
						let nearAvgFps = (() => {
							let v = 0;
							let n = Math.min(Performance.history.fps.length, 20);
							for (let i = 0; i < n; i++) {
								let cur = Performance.history.fps[i];
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

						
						if (Performance.history.fps.length > 10) { // fps graph
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
								let x = bounds.max.x - (i / Performance.history.fps.length) * (bounds.max.x - bounds.min.x);
								let y = bounds.max.y - ((point - fpsRanges.min) / fpsRange) * (bounds.max.y - bounds.min.y);
								return [x, y];
							}
							ctx.moveTo(...getPosition(Performance.history.fps[0], 0))
							for (let i = 1; i < Performance.history.fps.length; i++) {
								ctx.lineTo(...getPosition(Performance.history.fps[i], i));
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
						Render.roundedRect(6, 6, new vec(15, 13), 2, ctx);
						ctx.fill();
						
						
						ctx.restore();
					}
				});
			},
		}
	},
	World: new World(new vec(0, 0), 1000),
	Bodies: {
		bodies: 0,
		get uniqueId() {
			return this.bodies++;
		},
		canCollide: function(filterA, filterB) {
			let { category: categoryA, mask: maskA } = filterA;
			let { category: categoryB, mask: maskB } = filterB;

			let canA = maskA === 0 || categoryB === 0 || (maskA & categoryB) !== 0;
			let canB = maskB === 0 || categoryA === 0 || (maskB & categoryA) !== 0;

			return canA && canB;
		},

		rectangle: function(width, height, position, options = {}) {
			return new rectangle(width, height, position, options);
		},
		polygon: function(radius, numSides, position, options = {}) {
			return new polygon(radius, numSides, position, options);
		},
		circle: function(radius, position, options = {}) {
			return new circle(radius, position, options);
		},
		fromVertices: function(vertices, position, options = {}) {
			return new fromVertices(vertices, position, options);
		},
		update: function(body, delta) {
			if (!body.isStatic) {
				if (!body.parent) {
					this.updateVelocity(body, delta);
				}
				if (body.children.length === 0 && body.hasCollisions) {
					ter.World.dynamicGrid.updateBody(body);
				}
			}
		},
		cleansePair(pair) {
			const { Performance } = ter;
			if (pair.frame < Performance.frame) {
				let { bodyA, bodyB } = pair;
				const World = bodyA.world;

				// Remove pair
				bodyA.pairs.splice(bodyA.pairs.indexOf(pair.id), 1);
				bodyB.pairs.splice(bodyB.pairs.indexOf(pair.id), 1);
				delete World.pairs[pair.id];

				// Trigger collisionEnd
				bodyA.trigger("collisionEnd", pair);
				bodyB.trigger("collisionEnd", pair);

				return true;
			}
			return false;
		},
		updateVelocity: function(body, delta) {
			const timescale = delta;
			let { velocity: lastVelocity, angularVelocity: lastAngularVelocity } = body.last;

			let frictionAir = (1 - body.frictionAir) ** timescale;
			let frictionAngular = (1 - body.frictionAngular) ** timescale;

			if (isNaN(timescale) || body.velocity.isNaN() || isNaN(frictionAir + frictionAngular)) {
				return;
			}
			
			body.velocity.mult2(frictionAir);
			if (body.velocity.x !== 0 || body.velocity.y !== 0){
				body.translate(body.velocity.add(lastVelocity).mult(timescale / 2)); // trapezoidal rule to take into account acceleration
				// body.translate(body.velocity.mult(timescale)); // more stable
			}
			body.last.velocity.set(body.velocity);

			body.angularVelocity *= frictionAngular;
			if (body.angularVelocity){
				body.translateAngle((body.angularVelocity + lastAngularVelocity) / 2 * timescale); // trapezoidal rule to take into account acceleration
				// body.translateAngle((body.angularVelocity) * timescale); // more stable
			}
			body.last.angularVelocity = body.angularVelocity;
			
			body.updateBounds();
		},
		preUpdate: function(body, delta) {
			if (body.isStatic) return;
			const timescale = delta;

			// apply forces
			body.velocity.add2(body.force).add2(ter.World.gravity.mult(timescale));
			body.angularVelocity += body.torque;

			// clear forces
			body.force.x = 0;
			body.force.y = 0;
			body.torque = 0;
		},
	},
	Constraints: {
		create: function(bodyA, bodyB, options = {}) {
			return new Constraint(bodyA, bodyB, options);
		},
		rope: function(bodyA, bodyB, numConstraints, constraintOptions = {}, anchorOptions = {}) { // very unstable, need to implement as separate class
			let offsetA = constraintOptions.offsetA ?? new vec(0, 0);
			let offsetB = constraintOptions.offsetA ?? new vec(0, 0);
			let pointA = bodyA.position.add(offsetA.rotate(bodyA.angle));
			let pointB = bodyB.position.add(offsetB.rotate(bodyB.angle));
			let diff = pointB.sub(pointA);
			let length = constraintOptions.length ?? diff.length;
			let constraintDist = length / (numConstraints + 2);

			const circle = ter.Bodies.circle;
			const constraint = ter.Constraints.create;
			const merge = ter.Common.merge;

			diff.normalize2();

			let anchors = [];
			for (let i = 0; i < numConstraints; i++) {
				let position = pointA.add(diff.mult((i + 1) * constraintDist));
				anchors.push(circle(anchorOptions.radius ?? 2, position, anchorOptions));
			}

			let constraints = [];
			for (let i = 0; i < anchors.length + 1; i++) {
				let curBody = anchors[i - 1] ?? bodyA;
				let nextBody = anchors[i] ?? bodyB;

				let options = {};
				merge(options, constraintOptions);
				options.bodyA = curBody;
				options.bodyB = nextBody;
				options.length = constraintDist;

				if (curBody !== bodyA)
					options.offsetA = new vec(0, 0);
				if (nextBody !== bodyB)
					options.offsetB = new vec(0, 0);

				let c = constraint(curBody, nextBody, options);
				constraints.push(c);
				// c.delete();
			}

			return constraints;
		},
	},
	Engine: {
		delta: 1,
		substeps: 5,
		velocityIterations: 1,
		positionIterations: 1,
		constraintIterations: 1,
		maxShare: 1,

		update: function(delta) {
			const { World, Engine, Performance } = ter;
			const { bodies } = World;
			const { substeps } = Engine;

			// Get delta
			if (delta === undefined) {
				delta = Performance.delta * ter.World.timescale / 1000;
			}
			World.time += delta;
			delta /= substeps;
			Engine.delta = delta;

			// Get timing
			Performance.update();

			for (let step = 0; step < substeps; step++) {
				Performance.frame++;
				
				// Find collisions
				globalVectors = [];
				globalPoints = [];
				
				const pairs = World.collisionPairs;
				for (let i = 0; i < pairs.length; i++) {
					let bodyA = pairs[i][0];
					let bodyB = pairs[i][1];	
					Engine.testCollision(bodyA, bodyB);
				}
	
				// Apply forces
				for (let i = 0; i < bodies.length; i++) {
					let body = bodies[i];
					body.trigger("beforeUpdate");
					ter.Bodies.preUpdate(body, delta);
				}
	
				// Solve for velocities
				for (let i = 0; i < this.velocityIterations; i++) {
					Engine.solveVelocity(delta);
				}
				for (let i = 0; i < this.positionIterations; i++) {
					Engine.solvePositions();
				}
				Engine.solveConstraints(delta);
				
				// Update positions / angles
				for (let i = 0; i < bodies.length; i++) {
					let body = bodies[i];
					body.trigger("duringUpdate");
					ter.Bodies.update(body, delta);
				}
			}

			Engine.delta = delta * substeps;
		},
		testCollision: function(bodyA, bodyB) {
			const World = bodyA.world;
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
			if (bodyA.lastSeparations[bodyB.id]) {
				let axis = bodyA.lastSeparations[bodyB.id];
				let supportsA = getAllSupports(bodyA, axis);
				let supportsB = getAllSupports(bodyB, axis);
				let overlap = Math.min(supportsA.max - supportsB.min, supportsB.max - supportsA.min);

				if (overlap < 0) {
					collision = false;
				}
				else {
					delete bodyA.lastSeparations[bodyB.id];
					delete bodyB.lastSeparations[bodyA.id];
				}
			}
			if (collision) { // last separation didn't work - try all axes
				// ~ bodyA axes
				for (let j = 0; j < bodyA.axes.length; j++) {
					let axis = bodyA.axes[j];
					let supportsA = getAllSupports(bodyA, axis);
					let supportsB = getAllSupports(bodyB, axis);
					let overlap = Math.min(supportsA.max - supportsB.min, supportsB.max - supportsA.min);

					if (overlap < 0) {
						collision = false;
						bodyA.lastSeparations[bodyB.id] = axis;
						bodyB.lastSeparations[bodyA.id] = axis;
						break;
					}
				}
				// ~ bodyB axes
				for (let j = 0; j < bodyB.axes.length; j++) {
					let axis = bodyB.axes[j];
					let supportsA = getAllSupports(bodyB, axis);
					let supportsB = getAllSupports(bodyA, axis);
					let overlap = Math.min(supportsA.max - supportsB.min, supportsB.max - supportsA.min);
					
					if (overlap < 0) {
						collision = false;
						bodyA.lastSeparations[bodyB.id] = axis;
						bodyB.lastSeparations[bodyA.id] = axis;
						break;
					}
				}
			}

			if (collision === true) {
				// - get collision normal by getting point with minimum depth
				let minDepth = Infinity;
				let normal;
				let normalPoint;
				let contactBody;
				let normalBody;
				let contacts = [];
				let numContacts = 0;

				function findNormal(bodyA, bodyB) {
					let vertices = bodyA.vertices;
					for (let i = 0; i < vertices.length; i++) {
						let curVertice = vertices[i];
						let nextVertice = vertices[(i + 1) % vertices.length];
						let curNormal = curVertice.sub(nextVertice).normal().normalize();
						let support = bodyB.getSupport(curNormal, curVertice);

						if (bodyB.containsPoint(curVertice)) {
							contacts.push({ vertice: curVertice, body: bodyA });
							numContacts++;
						}

						if (support[1] < minDepth && !bodyB.isStatic) {
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

				if (Render.showCollisions) {
					globalVectors.push({ position: normalPoint, vector: normal.mult(-1) });
					globalPoints.push(...contacts.map(v => v.vertice));
				}

				normal = normal.mult(-1);

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

				if (World.pairs[pairId]) { // Collision active
					pair.start = World.pairs[pairId].start;
					bodyA.trigger("collisionActive", pair);
					bodyB.trigger("collisionActive", pair);
				}
				else { // Collision start
					bodyA.trigger("collisionStart", pair);
					bodyB.trigger("collisionStart", pair);
					
					bodyA.pairs.push(pairId);
					bodyB.pairs.push(pairId);
				}

				World.pairs[pairId] = pair;
			}
		},
		solveVelocity: function(delta) {
			let { pairs } = ter.World;
			
			for (let i in pairs) {
				let pair = pairs[i];
				if (!pair || ter.Bodies.cleansePair(pair)) continue;

				let { bodyA, bodyB, normal, tangent, contacts } = pair;
				let numContacts = contacts.length;
				if (numContacts === 0) continue;

				while (bodyA.parent && bodyA.parent !== bodyA) {
					bodyA = bodyA.parent;
				}
				while (bodyB.parent && bodyB.parent !== bodyB) {
					bodyB = bodyB.parent;
				}
				if (bodyA.isSensor || bodyB.isSensor) continue;

				const restitution = 1 + Math.max(bodyA.restitution, bodyB.restitution);
				const relVel = bodyB.velocity.sub(bodyA.velocity);
				const friction = Math.max(bodyA.friction, bodyB.friction);
				const slop = Math.max(bodyA.slop, bodyB.slop);

				if (relVel.dot(normal) < 0) {
					continue;
				}

				let impulse = new vec(0, 0);
				let angImpulseA = 0;
				let angImpulseB = 0;

				let totalMass = bodyA.mass + bodyB.mass;
				let shareA = (bodyB.mass / totalMass) || 0;
				let shareB = (bodyA.mass / totalMass) || 0;
				let maxShare = ter.Engine.maxShare;
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
					
					let normalImpulse = (restitution) * normalVelocity;

					// friction
					let tangentImpulse = tangentVelocity;

					let curImpulse = normal.mult(normalImpulse).add2(tangent.mult(tangentImpulse * friction));
					impulse.add2(curImpulse);
					angImpulseA += offsetA.cross(curImpulse) * bodyA.inverseInertia;
					angImpulseB += offsetB.cross(curImpulse) * bodyB.inverseInertia;
				}

				impulse.div2(numContacts);
				angImpulseA /= numContacts;
				angImpulseB /= numContacts;

				if (!bodyA.isStatic) {
					bodyA.velocity.sub2(impulse.mult(shareA));
					bodyA.angularVelocity -= angImpulseA * shareA;
				}
				if (!bodyB.isStatic) {
					bodyB.velocity.add2(impulse.mult(shareB));
					bodyB.angularVelocity += angImpulseB * shareB;
				}
			}
		},
		solvePositions: function() {
			const World = ter.World;
			const Bodies = ter.Bodies;
			let { pairs } = World;
			
			for (let i in pairs) {
				let pair = pairs[i];
				if (!pair || Bodies.cleansePair(pair)) continue;
				let { depth, bodyA, bodyB, normal } = pair;

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
				let maxShare = ter.Engine.maxShare;
				shareA = Math.min(maxShare, shareA);
				shareB = Math.min(maxShare, shareB);
				if (bodyA.isStatic) shareB = 1;
				if (bodyB.isStatic) shareA = 1;
				if (bodyA.isStatic || bodyB.isStatic) impulse.mult(2);

				if (!bodyA.isStatic) {
					let a = impulse.mult(shareA * 0.95);
					bodyA.translate(a);
				}
				if (!bodyB.isStatic) {
					let a = impulse.mult(-shareB * 0.95);
					bodyB.translate(a);
				}
				pair.depth -= impulse.length;
			}
		},
		solveConstraints: function(delta) {
			const constraints = ter.World.constraints;
			const constraintIterations = ter.Engine.constraintIterations;
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
					let maxShare = ter.Engine.maxShare;
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
							angularImpulse: offset.cross(curImpulse) * body.inverseInertia / 2,
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
		},
	},
	Common: {
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
		pair: function(x, y) { // Elegant pairing function - http://szudzik.com/ElegantPairing.pdf
			if (x > y)
				return x*x + x + y;
			return y*y + x;
		},
		unpair: function(n) {
			let z = Math.floor(Math.sqrt(n));
			let l = n - z * z;
			return l < z ? new vec(l, z) : new vec(z, l - z);
		},
		pairCommon: function(x, y) { // Elegant pairing function, but gives the same result if x/y are switched
			if (x > y)
				return x*x + x + y;
			return y*y + y + x;
		},
		getCenterOfMass(vertices) {
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
		merge: function(obj, options) { // deep copies options object onto obj, no return since it's in-place
			Object.keys(options).forEach(option => {
				let value = options[option];
				
				if (Array.isArray(value)) {
					obj[option] = [ ...value ];
				}
				else if (typeof value === "object" && value !== null) {
					if (typeof obj[option] !== "object") {
						obj[option] = {};
					}
					ter.Common.merge(obj[option], value);
				}
				else {
					obj[option] = value;
				}
			});
		},
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
				return false;
			}
		},
		lineIntersectsBody: function(a1, a2, body) { // tells you if line a1->a2 is intersecting with body, returns true/false
			if (body.children.length > 0) {
				for (let child of body.children) {
					if (ter.Common.lineIntersectsBody(a1, a2, child)) {
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
		raycast: function(start, end, bodies) { // raycast that gets you all info: { boolean collision, int distance, vec point, Body body, int verticeIndex }
			let lineIntersects = ter.Common.lineIntersects;
			let minDist = Infinity;
			let minPt = null;
			let minBody = null;
			let minVert = -1;

			if (bodies === undefined) {
				let grid = World.dynamicGrid;
				let size = grid.gridSize;
				let bounds = { min: start.min(end).div2(size).floor2(), max: start.max(end).div2(size).floor2() };
				bodies = [];
		
				for (let x = bounds.min.x; x <= bounds.max.x; x++) {
					for (let y = bounds.min.y; y <= bounds.max.y; y++) {
						let n = grid.pair(new vec(x, y));
						let node = grid.grid[n];
		
						if (node) {
							for (let body of node) {
								if (!bodies.includes(body) && body.children.length === 0) {
									bodies.push(body);
								}
							}
						}
					}
				}
			}

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
			let lineIntersectsBody = ter.Common.lineIntersectsBody;

			if (bodies === undefined) {
				let grid = ter.World.staticGrid;
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
			}

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
	},
	Render: {
		app: null,
		camera: {
			position: new vec(0, 0),
			fov: 3000,
			translation: new vec(0, 0),
			scale: 1,
			boundSize: 1000,
			
			// ~ Point transformations
			screenPtToGame: function(point) {
				let camera = ter.Render.camera;
				const scale = camera.scale;
				return new vec((point.x * Render.pixelRatio - camera.translation.x) / scale, (point.y * Render.pixelRatio - camera.translation.y) / scale);
			},
			gamePtToScreen: function(point) {
				let camera = ter.Render.camera;
				return new vec((point.x * camera.scale + camera.translation.x) / Render.pixelRatio, (point.y * camera.scale + camera.translation.y) / Render.pixelRatio);
			},
		},
		pixelRatio: 1,
		bodies: new Set(),
		update: function(delta) {
			let { Render } = ter;
			let { app, camera } = Render;
			let { stage } = app;
			let { position: cameraPosition, translation, fov, boundSize } = camera;

			ter.Render.trigger("beforeUpdate");

			let screenSize = new vec(app.screen.width, app.screen.height);
			translation.set({ x: -cameraPosition.x * boundSize/fov + screenSize.x/2, y: -cameraPosition.y * boundSize/fov + screenSize.y/2 });
			camera.scale = boundSize / fov;

			for (let body of Render.bodies) {
				if (body.render.graphic) {
					body.trigger("render");
					body.render.graphic.update();
				}
			}
			
			// update camera position
			stage.x = translation.x;
			stage.y = translation.y;
			stage.scale.x = camera.scale;
			stage.scale.y = camera.scale;

			if (Render.canvas) {
				let { ctx, canvas } = Render;
				let canvWidth = canvas.width;
				let canvHeight = canvas.height;
				
				const { position:cameraPosition, fov } = camera;
				const boundSize = camera.boundSize;
				const scale = camera.scale * devicePixelRatio;
				let translation = new vec({ x: -cameraPosition.x * boundSize/fov + canvWidth/2, y: -cameraPosition.y * boundSize/fov + canvHeight/2 });

				ctx.clearRect(0, 0, canvWidth, canvHeight);
				ctx.save();
				ctx.translate(translation.x, translation.y);
				ctx.scale(scale, scale);

				if (Render.showBroadphase === true) {
					Render.broadphase();
				}
				if (Render.showBoundingBox === true) {
					Render.boundingBox();
				}
				if (Render.showVertices === true) {
					Render.allVertices();
				}
				if (Render.showCollisions === true) {
					Render.allCollisions();
				}
				if (Render.showCenters === true) {
					Render.allCenters();
				}

				ctx.restore();
			}
			else if (Render.showVertices) {
				console.warn("No canvas created for debug view, use Render.createDebugView()");
			}

			ter.Render.trigger("afterUpdate");
		},

		// - Debug rendering
		canvas: null,
		ctx: null,
		createDebugView() {
			let { Render } = ter;
			if (Render.canvas) return;

			let scale = devicePixelRatio ?? 1;

			let canvas = Render.canvas = document.createElement("canvas");
			Render.ctx = canvas.getContext("2d");
			canvas.style.position = "absolute";
			canvas.style.zIndex = 1;
			canvas.style.top =  "0px";
			canvas.style.left = "0px";
			canvas.width  = scale * window.innerWidth;
			canvas.height = scale * window.innerHeight;
			canvas.style.background = "transparent";
			// canvas.style.pointerEvents = "none";
			canvas.style.transformOrigin = "top left";
			canvas.style.transform = `scale(${1 / scale}, ${1 / scale})`;
			document.body.appendChild(canvas);

			Render.app.renderer.on("resize", (width, height) => {
				let scale = devicePixelRatio ?? 1;
				canvas.width  = width  * scale;
				canvas.height = height * scale;
				canvas.style.transform = `scale(${1 / scale}, ${1 / scale})`;
			});
		},

		showCollisions: false,
		showBoundingBox: false,
		showVertices: false,
		showCenters: false,
		showBroadphase: false,
		
		allVertices: function() {
			const { Render } = ter;
			const { camera, ctx } = Render;
			const scale = camera.scale * devicePixelRatio;

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
			let allBodies = ter.World.bodies;
			for (let i = 0; i < allBodies.length; i++) {
				let body = allBodies[i];
				if (body.children.length === 0) {
					renderVertices(body.vertices);
				}
			}
			ctx.lineWidth = 2 / scale;
			ctx.strokeStyle = "#FF832A";
			ctx.stroke();
		},
		allCollisions: function() {
			const { ctx } = ter.Render;
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
		},
		allCenters: function() {
			const { ctx } = ter.Render;
			ctx.fillStyle = "#FF832A";
			let allBodies = ter.World.bodies;
			ctx.beginPath();
			for (let i = 0; i < allBodies.length; i++) {
				let body = allBodies[i];
				if (body.children.length === 0 || true) {
					ctx.moveTo(body.position.x, body.position.y);
					ctx.arc(body.position.x, body.position.y, 2 / this.camera.scale, 0, Math.PI*2);
				}
			}
			ctx.fill();
		},
		boundingBox: function() {
			const { ctx } = ter.Render;
			let allBodies = ter.World.bodies;
			let allConstraints = ter.World.constraints;

			ctx.strokeStyle = "#66666680";
			ctx.lineWidth = 1 / this.camera.scale;

			for (let i = 0; i < allBodies.length; i++) {
				let body = allBodies[i];
				if (!body.children || body.children.length === 0) {
					let bounds = body.bounds;
					let width  = bounds.max.x - bounds.min.x;
					let height = bounds.max.y - bounds.min.y;

					ctx.beginPath();
					ctx.strokeRect(bounds.min.x, bounds.min.y, width, height);
				}
			}
			ctx.strokeStyle = "#66666630";
			for (let i = 0; i < allConstraints.length; i++) {
				let constraint = allConstraints[i];
				let bounds = constraint.bounds;
				let width  = bounds.max.x - bounds.min.x;
				let height = bounds.max.y - bounds.min.y;

				ctx.beginPath();
				ctx.strokeRect(bounds.min.x, bounds.min.y, width, height);
			}
		},
		broadphase: function(tree = ter.World.dynamicGrid) {
			const { ctx } = ter.Render;
			let size = tree.gridSize;

			ctx.lineWidth = 0.4 / this.camera.scale;
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
		},

		// - Extra render funcs
		roundedPolygon: function(vertices, round, ctx) {
			if (vertices.length < 3) {
				console.warn("Render.roundedPolygon needs at least 3 vertices", vertices);
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
			Render.roundedPolygon([
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

		// - Events
		events: {
			beforeUpdate: [],
			afterUpdate: [],
		},
		on: function(event, callback) {
			let Render = ter.Render;
			if (Render.events[event]) {
				Render.events[event].push(callback);
			}
			else {
				console.warn(event + " is not a valid event");
			}
		},
		off: function(event, callback) {
			let Render = ter.Render;
			event = Render.events[event];
			if (event.includes(callback)) {
				event.splice(event.indexOf(callback), 1);
			}
		},
		trigger: function(event) {
			let Render = ter.Render;
			// Trigger each event
			if (Render.events[event]) {
				Render.events[event].forEach(callback => {
					callback();
				});
			}
		},
	}
}
