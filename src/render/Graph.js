const vec = require("../geometry/vec");
const { merge } = require("../core/Common");
const RenderMethods = require("../render/RenderMethods");

/**
 * Graph for tracking variables
 */
class Graph {
	static defaultOptions = {
		title: "",
		titleSize: 14,
		titleColor: "white",
		anchorX: "left",
		anchorY: "top",
		background: "#0D0D0DE6",
		maxLength: 200,
		scaleRange: 100,
		lineColor: "#9C9C9C",
		lineWidth: 1,
		padding: 8,
		round: 5,
	}
	/**
	 * If the graph is enabled
	 * @type {boolean}
	 * @readonly
	 */
	enabled = true;
	canvas;
	ctx;
	data = {};

	/**
	 * Creates a graph
	 * @param {number} width - Width of the graph
	 * @param {number} height - Height of the graph
	 * @param {vec} position - Position of the graph
	 * @param {object} options - Other graph options
	 * @param {string} [options.title=""] - Title of the graph
	 * @param {number} [options.titleSize=14] - Font size of title
	 * @param {string} [options.titleColor="white"] - Color of title
	 * @param {boolean} [options.enabled=true] - If graph starts enabled
	 * @param {("left"|"right"|"center")} [options.anchorX="left"] - Relative x position of graph on the screen
	 * @param {("top"|"bottom"|"center")} [options.anchorY="top"] - Relative y position of graph on the screen
	 * @param {string} [options.background="#0D0D0DE6"] - Background color of graph
	 * @param {number} [options.padding=8] - Amount of padding around the graph
	 * @param {number} [options.round=5] - Amount of round around the graph
	 * @param {number} [options.scaleRange=100] - Minimum range for auto scaling
	 * @param {Array} [options.scaleRange=undefined] - Minimum and maximum y value of the graph, as Array of `[min, max]`. Leaving `undefined` uses auto scaling.
	 * @param {number} [options.maxLength=200] - Maximum number of points the graph can have
	 * @param {string} [options.lineColor="#9C9C9C"] - Color of the line. Use this if you only have 1 value you're graphing
	 * @param {object} [options.lineColor={ default: "#9C9C9C" }] - Colors of each line name. Use this notation if you have multiple lines on one graph
	 * @param {number} [options.lineWidth=1] - Width of the graph lines
	 * @example
	 * let graph = new Graph(200, 150, new vec(20, 20), {
	 * 	maxLength: 800,
	 * 	title: "Hello graph",
	 * 	titleSize: 12,
	 * 	background: "transparent",
	 * 	lineColor: {
	 * 		itemA: "#9D436C",
	 * 		itemB: "#5EA8BA",
	 * 	},
	 * 	padding: 10,
	 * 	scaleRange: [0, 144 * 2],
	 * });
	 */
	
	constructor(width = 200, height = 200, position = new vec(0, 0), options = {}) {
		let mergedOptions = { ...Graph.defaultOptions };
		merge(mergedOptions, options, 1);
		let { anchorX, anchorY } = mergedOptions;
		
		if (typeof mergedOptions.lineColor === "string") {
			mergedOptions.lineColor = { default: mergedOptions.lineColor };
		}
		merge(this, mergedOptions, 1);
		this.width = width;
		this.height = height;

		// Create canvas
		let scale = this.scale = devicePixelRatio ?? 1;
		let canvas = this.canvas = document.createElement("canvas");
		this.ctx = canvas.getContext("2d");
		canvas.style.position = "absolute";
		canvas.style.zIndex = "2";

		if (anchorX === "center") {
			canvas.style.left = `calc(50vw + ${ position.x }px)`;
			canvas.style.transform = `translateX(-50%)`;
		}
		else {
			canvas.style[anchorX] = `${position.x}px`;
		}

		if (anchorY === "center") {
			canvas.style.top = `calc(50vh + ${ position.y }px)`;
			canvas.style.transform = `translateY(-50%)`;
		}
		else {
			canvas.style[anchorY] =  `${position.y}px`;
		}
		canvas.style.transformOrigin = `${anchorX} ${anchorY}`;
		canvas.style.transform += ` scale(${1 / scale}, ${1 / scale})`;

		canvas.style.top =  `${position.x}px`;
		canvas.width =  scale * width;
		canvas.height = scale * height;
		canvas.style.background = "transparent";
		// canvas.style.pointerEvents = "none";
		document.body.appendChild(canvas);

		// Set up rendering
		this.update = this.update.bind(this);

		if (this.enabled) {
			this.animationFrame = requestAnimationFrame(this.update);
		}
	}

	/**
	 * Set if the graph is enabled
	 */
	setEnabled(enabled) {
		this.enabled = enabled;

		if (this.animationFrame != undefined) { // prevent multiple render updates running at once
			cancelAnimationFrame(this.animationFrame);
			delete this.animationFrame;
		}

		if (this.enabled) { // start rendering
			this.canvas.style.display = "block";
			this.update();
		}
		else {
			this.canvas.style.display = "none";
		}
	}

	_getStats(data) {
		let max = 0;
		let min = Infinity;
		let avg = (() => {
			let v = 0;
			for (let i = 0; i < data.length; i++) {
				let cur = data[i];
				v += cur;
				max = Math.max(max, cur);
				min = Math.min(min, cur);
			}
			return v / data.length;
		})();

		return {
			max: max,
			min: min,
			average: avg,
		};
	}
	update() {
		let { canvas, ctx, enabled, scale, width, height, title, titleSize, titleColor, background, round, padding, lineColor: allLineColors, lineWidth, maxLength, scaleRange } = this;
		let { data: allData } = this;

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		if (enabled) {
			ctx.save();
			ctx.scale(scale, scale);

			// background
			ctx.beginPath();
			RenderMethods.roundedRect(width, height, new vec(width/2, height/2), round, ctx);
			ctx.fillStyle = background;
			ctx.fill();

			// title text
			ctx.beginPath();
			ctx.fillStyle = titleColor;
			ctx.textAlign = "left";
			ctx.font = `400 ${titleSize}px Arial`;
			ctx.fillText(title, padding, padding + titleSize - 4);
			

			// Find scale
			let valueRanges = {
				min: Infinity,
				max: -Infinity
			};
			if (Array.isArray(scaleRange)) {
				valueRanges = {
					min: scaleRange[0],
					max: scaleRange[1]
				};
			}
			else {
				for (let data of Object.values(allData)) {
					let { min, max } = this._getStats(data);
					valueRanges.min = Math.min(valueRanges.min, min);
					valueRanges.max = Math.max(valueRanges.max, max);
				}
				valueRanges.min = Math.min(valueRanges.min, (valueRanges.max + valueRanges.min - scaleRange) / 2);
				valueRanges.max = Math.max(valueRanges.max, (valueRanges.max + valueRanges.min + scaleRange) / 2);
			}
			
			let bounds = {
				min: new vec(padding, titleSize + padding + 5),
				max: new vec(width - padding, height - padding),
			};
			let boundSize = bounds.max.sub(bounds.min);
			function getPosition(point, i) {
				point = Math.max(valueRanges.min, Math.min(valueRanges.max, point));
				const range = valueRanges.max - valueRanges.min;
				let x = bounds.min.x + (i / maxLength) * boundSize.x;
				let y = bounds.max.y - ((point - valueRanges.min) / range) * boundSize.y;
				return [x, y];
			}

			for (let dataName in allData) {
				// get data stats
				let data = allData[dataName];
				let lineColor = allLineColors[dataName];
				
				// graph line
				if (data.length > 1) {
					ctx.beginPath();
					ctx.moveTo(...getPosition(data[0], 0))
					for (let i = 1; i < data.length; i++) {
						ctx.lineTo(...getPosition(data[i], i));
					}
					ctx.lineWidth = lineWidth;
					ctx.lineJoin = "bevel";
					ctx.strokeStyle = lineColor;
					ctx.stroke();
				}
			}
			
			
			ctx.restore();
			this.animationFrame = requestAnimationFrame(this.update);
		}
	}

	/**
	 * Adds value to the graph
	 * @param {number} value - Value to add
	 * @param {string} [name="default"] - Name of line
	 * @example
	 * graph.addData(20); // Adds value 20 to the default line
	 * graph.addData(102.4, "itemA"); // Adds value 102.4 to itemA line
	 */
	addData(value, name = "default") {
		if (!this.lineColor[name]) {
			console.error(this.lineColor);
			throw new Error(`No data named ${name} in graph`);
		}
		
		if (!this.data[name]) this.data[name] = [];
		let data = this.data[name];
		data.push(value);
		while (data.length > 0 && data.length > this.maxLength) {
			data.shift();
		}
	}
}

module.exports = Graph;
