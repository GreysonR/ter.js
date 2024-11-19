const vec = require("../geometry/vec.js");

/**
 * @namespace
 */
let GameFunctions = {
	/**
	 * Creates an HTML element using properties
	 * @param {string} type - Element tag name
	 * @param {Object} properties - Properties to add to the element
	 * @returns {Element} The new HTML element
	 * 
	 * @example
	 * // This creates an element with color, background, margin-left, and innerHTML and appends it to document.body
	 * let element = createElement("div", {
	 * 	parent: document.body,
	 * 	innerHTML: "Hello world!",
	 * 	color: "white",
	 * 	background: "#121A21",
	 * 	marginLeft: "20px"
	 * });
	 */
	createElement: function(type, properties) {
		let elem = document.createElement(type);

		function addProperties(elem, properties) {
			Object.keys(properties).forEach(property => {
				if (typeof properties[property] === "object" && !Array.isArray(property) && !(properties[property] instanceof Element)) {
					if (!elem[property]) elem[property] = {};
					addProperties(elem[property], properties[property]);
				}
				else {
					if (property === "class") {
						let classes = typeof properties[property] === "string" ? properties[property].split(" ") : properties[property];
						for (let className of classes) {
							elem.classList.add(className);
						}
					}
					else if (property === "parent") {
						properties[property].appendChild(elem);
					}
					else {
						elem[property] = properties[property];
					}
				}
			});
		}
		addProperties(elem, properties);

		return elem;
	},

	/**
	 * Standard Normal distribution using Box-Muller transform
	 * @param {Number} [mean=0]
	 * @param {Number} [stdev=1] - Standard deviation of distribution
	 * @param {Function} [random=Math.random] - Random number generator to use
	 * @returns {Number} - Point along distribution
	 */
	gaussianRandom: function(mean = 0, stdev = 1, random = Math.random) { // Standard Normal distribution using Box-Muller transform https://stackoverflow.com/a/36481059
		let u = 1 - random();
		let v = random();
		let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
		return z * stdev + mean;
	},

	/**
	 * Creates a seeded PRNG
	 * @param {Number} seed 
	 * @returns {Function} - PRNG that generates numbers between [0, 1)
	 * 
	 * @example
	 * let rng = createSeededRandom(1234);
	 * let value1 = rng(); // 0.6302
	 * let value2 = rng(); // 0.2039
	 * let value3 = rng(); // 0.4528
	 */
	createSeededRandom: function(seed) { // Returns function that generates numbers between [0, 1) https://stackoverflow.com/a/19301306
		var mask = 0xffffffff;
		var m_w = (123456789 + seed) & mask;
		var m_z = (987654321 - seed) & mask;
		
		return function() {
			m_z = (36969 * (m_z & 65535) + (m_z >> 16)) & mask;
			m_w = (18000 * (m_w & 65535) + (m_w >> 16)) & mask;
			var result = ((m_z << 16) + (m_w & 65535)) >>> 0;
			result /= 4294967296;
			return result;
		}
	},

	/**
	 * Generates a random number between the bounds
	 * @param {Array<Number>} bounds - Bounds of random in the format of [min, max] 
	 * @param {Function} [random=Math.random] - Random number generator to use
	 * @returns {Number} - Number between [min, max)
	 */
	boundedRandom: function([min, max], random = Math.random) {
		return random() * (max - min) + min;
	},

	/**
	 * Generates a random point within some bounds
	 * @param {Bounds} bounds - Bounding box that the random point can lie in
	 * @param {Function} [random=Math.random] - Random number generator to use
	 * @returns {vec} Point inside bounds
	 */
	boundedRandomPoint: function(bounds, random = Math.random) {
		return new vec(boundedRandom([bounds.min.x, bounds.max.x], random), boundedRandom([bounds.min.y, bounds.max.y], random));
	},
}
module.exports = GameFunctions;
