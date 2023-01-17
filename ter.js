"use strict";

var globalPoints = [];
var globalVectors = [];

var ter = {
	canvas: false,
	ctx: false,
	init: function(options) {
		this.canvas = options.canvas;
		this.ctx = options.ctx;

		this.setSize(options.width, options.height);
	},
	setSize(width, height) {
		ter.canvas.width =  width;
		ter.canvas.height = height;
		ter.Render.camera.boundSize = Math.sqrt(width * height) || 1; // Math.sqrt(width * height) || 1; // Math.sqrt(width**2 + height**2) / 2;
	},
	Performance: {
		enabled: false,
		lastUpdate: performance.now(),
		fps: 60,
		delta: 16.67,
		frameNo: 0,
		aliveTime: 0,

		history: {
			fps: [],
			delta: [],
		},

		update: function() {
			let Performance = ter.Performance;
			let curTime = performance.now();
			Performance.delta = curTime - Performance.lastUpdate;
			Performance.fps = 1000 / Performance.delta;
			Performance.lastUpdate = curTime;
			Performance.aliveTime += Performance.delta;
		},
		render: function() {
			let timing = ter.Performance;
			let ctx = ter.ctx;

			timing.history.fps.push(timing.fps);
			timing.history.delta.push(timing.delta);

			if (timing.history.fps.length > 100) {
				timing.history.fps.shift();
				timing.history.delta.shift();
			}
			let fps = (() => {
				let v = 0;
				for (let i = 0; i < timing.history.fps.length; i++) {
					v += timing.history.fps[i] / timing.history.fps.length;
				}
				return v;
			})();
			let delta = (() => {
				let v = 0;
				for (let i = 0; i < timing.history.delta.length; i++) {
					v += timing.history.delta[i] / timing.history.delta.length;
				}
				return v;
			})();

			ctx.fillStyle = "#2D2D2D80";
			ctx.fillRect(20, 20, 200, 70);

			ctx.textAlign = "left";
			ctx.font = "12px Arial";
			ctx.fillStyle = "#C7C8C9";
			ctx.fillText("FPS", 45, 50);
			ctx.fillText("Δ T", 45, 70);

			ctx.textAlign = "right";
			ctx.fillStyle = "#FFFFFF";
			ctx.fillText(Math.round(fps), 190, 50);
			ctx.fillText((Math.round(delta * 100) / 100).toFixed(2) + "ms", 190, 70);
		}
	},
	World: {
		gravity: new vec(0, 0),
		timescale: 1,

		bodies: [],
		tree: new quadtree(),
		constraints: [],
		pairs: {},
		
		getPairs: function(bodies) {
			let pairs = [];

			for (let i = 0; i < bodies.length - 1; i++) {
				if (bodies[i].removed) {
					ter.World.tree.removeBody(bodies[i]);
					continue;
				}
				if (!bodies[i].hasCollisions)
					continue;
				
				for (let j = i + 1; j < bodies.length; j++) {
					// Do AABB collision test
					let bodyA = bodies[i];
					let bodyB = bodies[j];

					if (bodyB.removed) {
						ter.World.tree.removeBody(bodyB);
						continue;
					}
					if (!bodyB.hasCollisions)
						continue;


					const boundsA = bodyA.bounds;
					const boundsB = bodyB.bounds;
					const AABBCollision = !(boundsA.min.x > boundsB.max.x ||
											boundsA.max.x < boundsB.min.x ||
											boundsA.min.y > boundsB.max.y ||
											boundsA.max.y < boundsB.min.y);
					if (AABBCollision) {
						pairs.push([ bodyA, bodyB ]);
					}
				}
			}

			return pairs;
		},
		get collisionPairs() {
			let bodies = ter.World.tree.tree.nodes;
			let pairs = {};

			function crawl(node) {
				if (node.bodies.size > 1) {
					if (node[0]) {
						for (let i = 4; i--;) {
							if (!node[i]) break;
							if (node[i].bodies.size > 1) {
								crawl(node[i]);
							}
						}
					}
					else {
						let newPairs = ter.World.getPairs(Array.from(node.bodies));
						for (let i = 0; i < newPairs.length; i++) {
							let p = newPairs[i];
							let id = ter.Common.pairCommon(p[0].id, p[1].id);
							if (!pairs[id]) pairs[id] = p;
						}
					}
				}
			}
			
			let foundBody = false;
			for (let id in bodies) {
				if (!isNaN(Number(id))) {
					if (bodies[id].bodies.size > 1) {
						foundBody = true;
						crawl(bodies[id]);
					}
				}
			}
			if (!foundBody) {
				let newPairs = ter.World.getPairs(Array.from(bodies.bodies));
				for (let i = 0; i < newPairs.length; i++) {
					let p = newPairs[i];
					let id = ter.Common.pairCommon(p[0].id, p[1].id);
					if (!pairs[id]) pairs[id] = p;
				}
			}

			return Object.values(pairs);
		},
	},
	Bodies: {
		bodies: 0,
		get uniqueId() {
			return this.bodies++;
		},

		rectangle: function(width, height, position, options) {
			return new rectangle(width, height, position, options);
		},
		polygon: function(radius, numSides, position, options) {
			return new polygon(radius, numSides, position, options);
		},
		circle: function(radius, position, options) {
			return new circle(radius, position, options);
		},
		fromVertices: function(vertices, position, options) {
			return new fromVertices(vertices, position, options);
		},
		getInertia: function(body) {
			const { vertices, mass } = body;
			
			let numerator = 0;
			let denominator = 0;
	
			for (var i = 0; i < vertices.length; i++) {
				let j = (i + 1) % vertices.length;
				let cross = Math.abs(vertices[j].cross(vertices[i]));
				numerator += cross * (vertices[j].dot(vertices[j]) + vertices[j].dot(vertices[i]) + vertices[i].dot(vertices[i]));
				denominator += cross;
			}
	
			return 4 * (mass / 6) * (numerator / denominator);
		},
		update: function(body) {
			if (!body.static) {
				this.updateVelocity(body);
				ter.World.tree.updateBody(body);
			}
		},
		cleansePair(pair) {
			const { World, Performance } = ter;
			if (pair.frame < Performance.frameNo) {
				let { bodyA, bodyB } = pair;

				// Remove pair
				bodyA.pairs.splice(bodyA.pairs.indexOf(pair.id));
				bodyB.pairs.splice(bodyB.pairs.indexOf(pair.id));
				delete World.pairs[pair.id];

				// Trigger collisionEnd
				bodyA.trigger("collisionEnd", pair);
				bodyB.trigger("collisionEnd", pair);

				return true;
			}
			return false;
		},
		updateVelocity: function(body) {
			const timescale = ter.Performance.delta / 16.667 * ter.World.timescale;
			const timescaleSqrt = timescale ** 0.5;

			let frictionAir = (1 - body.frictionAir) ** timescale;
			let frictionAngular = (1 - body.frictionAngular) ** timescale;
			let lastVelocity = body.position.sub(body.last.position);
			
			body.force.add2(World.gravity.mult(body.mass * timescale));
			body.velocity = lastVelocity.mult2(frictionAir).add2(body.force.div(body.mass)).mult2(timescaleSqrt);
			
			body.position.add2(body.velocity);
			body.last.position.x = body.position.x - body.velocity.x / timescaleSqrt;
			body.last.position.y = body.position.y - body.velocity.y / timescaleSqrt;

			body.angularVelocity = ((body.angle - body.last.angle) * frictionAngular) + (body.torque / body.inertia);
			body.last.angle = body.angle;
			if (Math.abs(body.angularVelocity) < 0.0001) body.angularVelocity = 0;
			body.angle += body.angularVelocity;

			for (let j = 0; j < body.vertices.length; j++) {
				let vertice = body.vertices[j];
				vertice.add2(body.velocity);
				
				if (body.angularVelocity !== 0) {
					vertice.sub2(body.position).rotate2(body.angularVelocity).add2(body.position);
				}
			}

			body.velocity.div2(timescaleSqrt);
			body.updateBounds();
		},
		solvePositions: function() {
			let { pairs } = ter.World;
			
			for (let i in pairs) {
				let pair = pairs[i];
				if (!pair || this.cleansePair(pair)) continue;
				const { depth, bodyA, bodyB, contacts, normal } = pair;
				if (bodyA.isSensor || bodyB.isSensor) continue;

				// update body velocities
				bodyA.velocity = bodyA.position.sub(bodyA.last.position);
				bodyB.velocity = bodyB.position.sub(bodyB.last.position);
				bodyA.angularVelocity = bodyA.angle - bodyA.last.angle;
				bodyB.angularVelocity = bodyB.angle - bodyB.last.angle;

				const contactShare = 0.9 / contacts.length; // 0.9 / body.totalContacts

				for (let j = 0; j < contacts.length; j++) {
					const { vertice } = contacts[j];
					const offsetA = vertice.sub(bodyA.position);
					const offsetB = vertice.sub(bodyB.position);
					
					let impulse = (depth - 0.5) * ter.Performance.delta / 16.667;
					if (impulse <= 0) continue;
					if (bodyA.static || bodyB.static) impulse *= 2;

					if (!bodyA.static) {
						bodyA.last.position.sub2(normal.mult(impulse * contactShare * 0.6));
						bodyA.angle += offsetA.cross(normal) / 50000 * bodyA.inverseMass;
					}
					if (!bodyB.static) {
						bodyB.last.position.add2(normal.mult(impulse * contactShare * 0.6));
						bodyB.angle -= offsetB.cross(normal) / 50000 * bodyB.inverseMass;
					}
				}
			}
		},
		solvePositionsBasic: function() {
			const World = ter.World;
			let { pairs } = World;
			
			for (let i in pairs) {
				let pair = pairs[i];
				if (!pair || this.cleansePair(pair)) continue;
				const { depth, bodyA, bodyB, normal } = pair;
				
				let impulse = normal.mult(depth / 5);
				let totalMass = bodyA.mass + bodyB.mass;
				let shareA = (bodyB.mass / totalMass) || 0;
				let shareB = (bodyA.mass / totalMass) || 0;
				if (bodyA.static) shareB = 1;
				if (bodyB.static) shareA = 1;
				// if (bodyA === car || bodyB === car) console.log(shareA, shareB, bodyA === car);
				if (bodyA.static || bodyB.static) impulse.mult(2);

				if (!bodyA.static) {
					bodyA.translate(impulse.mult(shareA));
					// bodyA.last.position.add2(impulse.mult(restitution));
				}
				if (!bodyB.static) {
					bodyB.translate(impulse.inverse().mult(shareB));
					// bodyB.last.position.sub2(impulse.mult(restitution));
				}
			}
		},
		postUpdate: function() {
			const World = ter.World;
			for (let i = 0; i < World.bodies.length; i++) {
				let body = World.bodies[i];

				// clear forces
				body.force.x = 0;
				body.force.y = 0;
				body.torque = 0;
			}
		}
	},
	Engine: {
		velocityIterations: 1,
		positionIterations: 1,
		basicSolver: true,
		update: function() {
			const { World, Engine, Bodies } = ter;
			const { bodies } = World;

			// Get timing
			Performance.update();
			Performance.frameNo++;

			// Update positions / angles
			for (let i = 0; i < bodies.length; i++) {
				ter.Bodies.update(bodies[i]);
			}

			Bodies.postUpdate();
			
			/*
			globalVectors = [];
			globalPoints = [];
			Engine.testCollisions();
			if (ter.Engine.basicSolver) {
				Engine.solveVelocitiesBasic();
				Bodies.solvePositionsBasic();
			}
			else {
				for (let i = 0; i < this.velocityIterations; i++) {
					Engine.solveVelocity();
				}
				for (let i = 0; i < this.positionIterations; i++) {
					Bodies.solvePositions();
				}
			}/**/
		},
		updateCollisions: function() {
			globalVectors = [];
			globalPoints = [];
			Engine.testCollisions();
			if (ter.Engine.basicSolver) {
				Engine.solveVelocitiesBasic();
				Bodies.solvePositionsBasic();
			}
			else {
				for (let i = 0; i < this.velocityIterations; i++) {
					Engine.solveVelocity();
				}
				for (let i = 0; i < this.positionIterations; i++) {
					Bodies.solvePositions();
				}
			}
		},
		testCollisions: function() {
			const { World, Common: Basic, Performance } = ter;
			const { collisionPairs:pairs } = World;

			// - go through possible collision pairs
			for (let i = 0; i < pairs.length; i++) {
				let bodyA = pairs[i][0];
				let bodyB = pairs[i][1];
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

							if (support[1] < minDepth) {
								minDepth = support[1];
								normal = curNormal.inverse();
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

					// globalVectors.push({ position: normalPoint, vector: normal.inverse() });
					// globalPoints.push(...contacts.map(v => v.vertice));

					normal = normal.inverse();

					let pairId = Basic.pairCommon(bodyA.id, bodyB.id);
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
						frame: Performance.frameNo,
					}

					if (World.pairs[pairId]) { // Collision active
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
			}
		},
		solveVelocity: function() {
			let { pairs } = ter.World;
			
			for (let i in pairs) {
				let pair = pairs[i];
				if (!pair) continue;

				let { Common: Basic } = ter;
				const { bodyA, bodyB, contacts, normal, tangent, depth } = pair;
				if (bodyA.isSensor || bodyB.isSensor) continue;

				// update body velocities
				bodyA.velocity = bodyA.position.sub(bodyA.last.position);
				bodyB.velocity = bodyB.position.sub(bodyB.last.position);
				bodyA.angularVelocity = bodyA.angle - bodyA.last.angle;
				bodyB.angularVelocity = bodyB.angle - bodyB.last.angle;

				const restitution = Math.max(bodyA.restitution, bodyB.restitution);
				const friction = Math.max(bodyA.friction, bodyB.friction);
				const contactShare = 1 / pair.totalContacts;

				for (let j = 0; j < contacts.length; j++) {
					const { vertice } = contacts[j];
					const offsetA = vertice.sub(bodyA.position).sub(bodyA.velocity);
					const offsetB = vertice.sub(bodyB.position).sub(bodyB.velocity);
					const vpA = bodyA.velocity.add(offsetA.normal().mult(-bodyA.angularVelocity));
					const vpB = bodyB.velocity.add(offsetB.normal().mult(-bodyB.angularVelocity));
					const relativeVelocity = vpA.sub(vpB);
					const normalVelocity = relativeVelocity.dot(normal);

					if (Math.abs(normalVelocity) < 0.1) {
						// console.log(normalVelocity);
						// debugger;
					};

					const tangentVelocity = relativeVelocity.dot(tangent);
					const tangentSpeed = Math.abs(tangentVelocity);

					if (normalVelocity > 0) continue;
					
					let normalImpulse = (1 + restitution) * normalVelocity;
					let normalForce = Basic.clamp(depth + normalVelocity, 0, 1) * 5;

					// friction
					let tangentImpulse = tangentVelocity;
					let maxFriction = Infinity;

					if (tangentSpeed > friction * friction * normalForce) { // second friction would be staticFriction
						maxFriction = tangentSpeed;
						tangentImpulse = Basic.clamp(friction * Math.sign(tangentVelocity), -maxFriction, maxFriction);
					}
					
					const oAcN = offsetA.cross(normal);
					const oBcN = offsetB.cross(normal);
					const share = contactShare / (bodyA.inverseMass + bodyB.inverseMass + bodyA.inverseInertia * oAcN * oAcN  + bodyB.inverseInertia * oBcN * oBcN);
					
					normalImpulse *= share;
					tangentImpulse *= share;

					if (normalVelocity < 0 && normalVelocity * normalVelocity > 4) { // 4 is resting threshold
						normalImpulse = 0;
					}
					else {
						var contactNormalImpulse = normalImpulse;
						normalImpulse = Math.min(normalImpulse + normalImpulse, 0);
						normalImpulse = normalImpulse - contactNormalImpulse;
					}

					// apply forces
					const impulse = normal.mult(normalImpulse).add2(tangent.mult(tangentImpulse));
					if (!bodyA.static) {
						bodyA.last.position.add2(impulse.mult(bodyA.inverseMass));
						bodyA.last.angle += offsetA.cross(impulse) * bodyA.inverseInertia;
					}
					if (!bodyB.static) {
						bodyB.last.position.sub2(impulse.mult(bodyB.inverseMass));
						bodyB.last.angle -= offsetB.cross(impulse) * bodyB.inverseInertia;
					}
				}
			}
		},
		solveVelocitiesBasic: function() {
			let { pairs } = ter.World;
			
			for (let i in pairs) {
				let pair = pairs[i];
				if (!pair || ter.Bodies.cleansePair(pair)) continue;

				const { bodyA, bodyB, normal, tangent } = pair;
				if (bodyA.isSensor || bodyB.isSensor) continue;
				
				// update body velocities
				bodyA.velocity = bodyA.position.sub(bodyA.last.position);
				bodyB.velocity = bodyB.position.sub(bodyB.last.position);

				// update body velocities
				bodyA.velocity = bodyA.position.sub(bodyA.last.position);
				bodyB.velocity = bodyB.position.sub(bodyB.last.position);
				bodyA.angularVelocity = bodyA.angle - bodyA.last.angle;
				bodyB.angularVelocity = bodyB.angle - bodyB.last.angle;

				const restitution = 1 + Math.max(bodyA.restitution, bodyB.restitution);
				const relVel = bodyB.velocity.sub(bodyA.velocity);
				const friction = Math.max(bodyA.friction, bodyB.friction);


				if (relVel.dot(normal) < 0) {
					continue;
				}

				let impulse = normal.mult(normal.dot(relVel) * -restitution).sub2(tangent.abs().mult(relVel.mult(friction)));
				// if (bodyA.static || bodyB.static) impulse.mult2(1.5);
				let totalMass = bodyA.mass + bodyB.mass;
				let shareA = (bodyB.mass / totalMass) || 0;
				let shareB = (bodyA.mass / totalMass) || 0;
				if (bodyA.static) shareB = 1;
				if (bodyB.static) shareA = 1;

				if (!bodyA.static) {
					bodyA.last.position.add2(impulse.mult(shareA));
				}
				if (!bodyB.static) {
					bodyB.last.position.sub2(impulse.mult(shareB));
				}
			}
		},
	},
	Common: {
		clamp: function(x, min, max) {
			return Math.max(min, Math.min(x, max));
		},
		angleDiff: function(angle1, angle2) {
			function mod(a, b) {
				return a - Math.floor(a / b) * b;
			}
			return mod(angle1 - angle2 + Math.PI, Math.PI * 2) - Math.PI;
		},
		pair: function(x, y) { // Elegant pairing function - http://szudzik.com/ElegantPairing.pdf
			if (x > y)
				return x*x + x + y;
			return y*y + x;
		},
		pairCommon: function(x, y) { // Elegant pairing function, but gives the same result if x/y are switched
			if (x > y)
				return x*x + x + y;
			return y*y + y + x;
		},
	},
	Render: (() => {
		let Render = function() {
			const { canvas, ctx, Performance, Render } = ter;

			const camera = Render.camera;
			const { position:cameraPosition, fov:FoV, boundSize } = camera;
			const canvWidth = canvas.width;
			const canvHeight = canvas.height;
			const bodies = Render.bodies;

			ctx.clearRect(0, 0, canvWidth, canvHeight);

			camera.translation = { x: -cameraPosition.x * boundSize/FoV + canvWidth/2, y: -cameraPosition.y * boundSize/FoV + canvHeight/2 };
			camera.scale = boundSize / FoV;

			// { x: (point.x - camera.translation.x) / camera.scale, y: (point.y - camera.translation.y) / camera.scale }
			camera.bounds.min.set({ x: -camera.translation.x / camera.scale, y: -camera.translation.y / camera.scale });
			camera.bounds.max.set({ x:  (canvWidth - camera.translation.x) / camera.scale, y:  (canvHeight - camera.translation.y) / camera.scale });

			Render.trigger("beforeSave");
			ctx.save();
			ctx.translate(camera.translation.x, camera.translation.y);
			ctx.scale(camera.scale, camera.scale);
			
			if (Render.showBroadphase === true) {
				Render.broadphase();
			}

			Render.trigger("beforeRender");
			let layers = Object.keys(bodies).sort((a, b) => {
				a = Number(a);
				b = Number(b);
				return a < b ? -1 : a > b ? 1 : 0;
			});
			for (let layerId of layers) {
				let layer = bodies[layerId];
				Render.trigger("beforeLayer" + layerId);
				for (let body of layer) {
					const { position, vertices, render, bounds } = body;
					const { visible, background, border, borderWidth, borderType, lineDash, bloom, opacity, sprite } = render;
					const inView = !(bounds.max.x < camera.bounds.min.x || bounds.min.x > camera.bounds.max.x
								 || bounds.max.y < camera.bounds.min.y || bounds.min.y > camera.bounds.max.y);

					if (visible && inView) {
						ctx.beginPath();
						ctx.globalAlpha = opacity ?? 1;
						ctx.lineWidth = borderWidth;
						ctx.strokeStyle = border;
						ctx.fillStyle = background;
						ctx.lineJoin = borderType;
	
						if (bloom) {
							ctx.shadowColor = border;
							ctx.shadowBlur = bloom * camera.scale;
						}
			
						if (lineDash) {
							ctx.setLineDash(lineDash);
						}
						else {
							ctx.setLineDash([]);
						}

						function renderVertices() {
							ctx.moveTo(vertices[0].x, vertices[0].y);
		
							for (let j = 0; j < vertices.length; j++) {
								if (j > 0) {
									let vertice = vertices[j];
									ctx.lineTo(vertice.x, vertice.y);
								}
							}
				
							ctx.closePath();
						}
	
						if (sprite && Render.images[sprite]) { // sprite render
							let { spriteX, spriteY, spriteWidth, spriteHeight } = render;
	
							ctx.translate(position.x, position.y);
							ctx.rotate(body.angle)
							ctx.drawImage(Render.images[sprite], spriteX, spriteY, spriteWidth, spriteHeight);
							ctx.rotate(-body.angle);
							ctx.translate(-position.x, -position.y);

							continue;
						}
			
						ctx.beginPath();
	
						if (body.type === "circle") { // circle render
							ctx.arc(position.x, position.y, body.radius, 0, Math.PI*2);
						}
						else if (body.type === "rectangle") { // rectangle render
							let { width, height } = body;
							ctx.rect(position.x - width/2, position.y - height/2, width, height);
						}
						else { // vertice render
							renderVertices();
						}

						if (ctx.fillStyle && ctx.fillStyle !== "transparent") ctx.fill();
						if (ctx.strokeStyle && ctx.strokeStyle !== "transparent") ctx.stroke();
						
						if (bloom) {
							ctx.shadowColor = "rgba(0, 0, 0, 0)";
							ctx.shadowBlur = 0;
						}
						ctx.globalAlpha = 1;
					}
				}
			}
			
			if (Render.showBoundingBox === true) {
				Render.boundingBox();
			}
			if (Render.showVertices === true) {
				Render.allVertices();
			}
			if (Render.showCenters === true) {
				Render.allCenters();
			}

			if (globalPoints.length > 0) { // Render globalPoints
				for (let i = 0; i < globalPoints.length; i++) {
					let point = globalPoints[i];
					ctx.beginPath();
					ctx.arc(point.x, point.y, 4, 0, Math.PI*2);
					ctx.fillStyle = "#e8e8e8";
					ctx.fill();
				}
			}
			if (globalVectors.length > 0) { // Render globalVectors
				for (let i = 0; i < globalVectors.length; i++) {
					let point = globalVectors[i].position;
					let vector = globalVectors[i].vector;
					ctx.beginPath();
					ctx.moveTo(point.x, point.y);
					ctx.lineTo(point.x + vector.x * 20, point.y + vector.y * 20);
					ctx.strokeStyle = "#FFAB2E";
					ctx.lineWidth = 3;
					ctx.stroke();
				}
			}

			Render.trigger("afterRender");
			ctx.restore();

			if (Performance.enabled) {
				Performance.render();
			}
			Render.trigger("afterRestore");
		}
		Render.bodies = [new Set()];

		// - Camera
		Render.camera = {
			position: { x: 0, y: 0 },
			fov: 2000,
			translation: { x: 0, y: 0 },
			scale: 1,
			boundSize: 1,
			bounds: {
				min: new vec({ x: 0, y: 0 }),
				max: new vec({ x: 2000, y: 2000 }),
			},
			// ~ Camera
			screenPtToGame: function(point) {
				let camera = ter.Render.camera;
				return new vec({ x: (point.x - camera.translation.x) / camera.scale, y: (point.y - camera.translation.y) / camera.scale });
			},
			gamePtToScreen: function(point) {
				let camera = ter.Render.camera;
				return new vec({ x: point.x * camera.scale + camera.translation.x, y: point.y * camera.scale + camera.translation.y });
			},
		}


		// - Images
		Render.images = {};
		Render.loadImg = function(name) {
			let img = new Image();
			img.src = "./img/" + name;

			img.onload = function() {
				Render.images[name.split(".")[0]] = img;
			}
		}

		// - Events
		Render.events = {
			beforeRender: [],
			afterRender: [],
			afterRestore: [],
			beforeSave: [],
		}
		Render.on = function(event, callback) {
			if (event.includes("beforeLayer") && !Render.events[event]) {
				Render.events[event] = [];
			}

			if (Render.events[event]) {
				Render.events[event].push(callback);
			}
			else {
				console.warn(event + " is not a valid event");
			}
		}
		Render.off = function(event, callback) {
			event = Render.events[event];
			if (event.includes(callback)) {
				event.splice(event.indexOf(callback), 1);
			}
		}
		Render.trigger = function(event) {
			// Trigger each event
			if (Render.events[event]) {
				Render.events[event].forEach(callback => {
					callback();
				});
			}
		}

		
		// - Broadphase
		Render.showBoundingBox = false;
		Render.boundingBox = function() {
			let allBodies = ter.World.bodies;

			ctx.strokeStyle = "#ffffff80";
			ctx.lineWidth = 2;

			for (let i = 0; i < allBodies.length; i++) {
				let body = allBodies[i];
				let bounds = body.bounds;
				let width = bounds.max.x - bounds.min.x;
				let height = bounds.max.y - bounds.min.y;

				ctx.beginPath();
				ctx.strokeRect(bounds.min.x, bounds.min.y, width, height);
			}
		}
		Render.showVertices = false;
		Render.allVertices = function() {
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
				renderVertices(body.vertices);
			}
			ctx.lineWidth = 3;
			ctx.strokeStyle = "#FF832A";
			ctx.stroke();
		}
		Render.showCenters = false;
		Render.allCenters = function() {
			ctx.lineWidth = 3;
			ctx.strokeStyle = "#FF832A";
			let allBodies = ter.World.bodies;
			for (let i = 0; i < allBodies.length; i++) {
				let body = allBodies[i];
				ctx.beginPath();
				ctx.arc(body.position.x, body.position.y, 2, 0, Math.PI*2);
				ctx.stroke();
			}
		}

		// - Quadtree
		Render.showBroadphase = false;
		Render.broadphase = function() {
			let tree = ter.World.tree.tree;
			ctx.lineWidth = 0.3;
			ctx.strokeStyle = "#947849";
			ctx.fillStyle = "#947849";
			ctx.font = "20px Arial";
			function renderNode(node, position, size, depth) {
				Object.keys(node).forEach(childId => {
					childId = Number(childId);
					if (isNaN(childId)) return;
		
					// ctx.fillStyle = "#947849";
					// ctx.strokeStyle = "#947849";

					let pos = depth === 0 ? tree.unpairNeg(childId) : tree.unpair(childId);
					let curPos = position.add(pos.mult(size));
					ctx.strokeRect(curPos.x, curPos.y, size, size);
					// ctx.globalAlpha = 0.015 * node.bodies.length;
					// ctx.fillRect(curPos.x, curPos.y, size, size);
					// ctx.globalAlpha = 1;

					// ctx.fillStyle = "#ffffff80";
					// let p2 = new vec(curPos);
					// ctx.fillText(childId, p2.x + 10, p2.y + 10);
		
					renderNode(node[childId], curPos, size / 2, depth + 1);
				});
			}
			renderNode(tree.nodes, new vec(0, 0), tree.nodeSize, 0);
		}
		
		return Render;
	})(),
}
