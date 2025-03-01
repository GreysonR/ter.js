const vec = require("../geometry/vec.js");

/**
 * @namespace
 * @private
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
}
module.exports = GameFunctions;
