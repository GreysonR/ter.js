// TODO: Keyup events with multiple buttons work even if the letter key wasn't what was released first
/**
 * Handles key and mouse inputs
 */
class Inputs {
	constructor() {
		window.addEventListener("keydown", event => this.#handleKeydown.call(this, event));
		window.addEventListener("keyup", event => this.#handleKeyup.call(this, event));

		window.addEventListener("mousedown", event => this.#handleMousedown.call(this, event))
	}
	#handleKeydown(event) {
		if (event.repeat) return;

		let key = event.key.toLowerCase();
		let fullKeyName = (event.ctrlKey ? "ctrl" : "") + (event.altKey ? "alt" : "") + (event.shiftKey ? "shift" : "") + key;
		this.#pressed.add(key);

		
		if (this.#binds[fullKeyName]) {
			this.trigger(fullKeyName, true);
		}
		else if (this.#binds[key]) {
			this.trigger(key, true);
		}
	}
	#handleKeyup(event) {
		if (event.repeat) return;

		let key = event.key.toLowerCase();
		let fullKeyName = (event.ctrlKey ? "ctrl" : "") + (event.altKey ? "alt" : "") + (event.shiftKey ? "shift" : "") + key;

		this.#pressed.delete(key);
		
		if (this.#binds[fullKeyName]) {
			this.trigger(fullKeyName, false);
		}
		else if (this.#binds[key]) {
			this.trigger(key, false);
		}
	}
	#handleMousedown(event) {
		let fullName = "mouse" + event.button;
		console.log(fullName);
	}
	
	/**
	 * Call to disable the context menu when the user right clicks the window
	 */
	blockRightClick() {
		window.addEventListener("contextmenu", event => {
			event.preventDefault();
		});
	}

	/**
	 * Checks if a key input name is valid and formatted correctly
	 * @param {string} event - Name of key bind
	 * @returns {boolean} If the event is formatted correctly
	 */
	isValidKeyEvent(event) {
		return event.replace(/(ctrl)?(alt)?(shift)?[a-zA-Z]+/i, "").length === 0;
	}
	/**
	 * Checks if a mouse input name is valid and formatted correctly
	 * @param {string} event - Name of key bind
	 * @returns {boolean} If the event is formatted correctly
	 */
	isValidMouseEvent(event) {
		return event.replace(/(mouse)\d+/i, "").length === 0;
	}

	/**
	 * Check if a key (or set of keys) is currently being pressed
	 * @param {...string} keys - Key to check
	 * @returns {boolean} If the set of keys is pressed
	 * @example
	 * inputs.isPressed("d");
	 * inputs.isPressed("ctrl", "alt", "shift", "s"); // can be in any order
	 */
	isPressed(...keys) {
		if (keys.length === 0) return false;
		for (let k of keys) {
			if (!this.#pressed.has(k)) // A key is not pressed
				return false;
		}
		// All keys are pressed
		return true;
	}

	#pressed = new Set();
	#binds = {};

	/**
	 * Bind a callback to an event
	 * @param {string} event - Keys pressed in event
	 * @param {Function} callback - Callback run when event is fired
	 * @example
	 * // key events
	 * inputs.on("a", keydown => { // called when 'a' is pressed down or up
	 * 	if (keydown) { // 'a' key is depressed
	 * 		// do some logic
	 * 	}
	 * 	else { // 'a' key is no longer depressed
	 * 		// logic
	 * 	}
	 * });
	 * inputs.on("altW", keydown => {}); // alt + w
	 * inputs.on("ctrlAltShiftH", {}); // ctrl + alt + shift + h. Must be in this order, but can take out ctrl/alt/shift as needed
	 * 
	 * // mouse events
	 * inputs.on("mouse0", keydown => {}); // left click
	 * inputs.on("mouse1", keydown => {}); // middle click
	 * inputs.on("mouse2", keydown => {}); // right click
	 * 
	 */
	on(event, callback) {
		event = event.toLowerCase();
		if (this.isValidKeyEvent(event) || this.isValidMouseEvent(event)) {
			if (!this.#binds[event]) this.#binds[event] = [];
			this.#binds[event.toLowerCase()].push(callback);
		}
		else {
			console.warn(event + " is not a valid event");
		}
	}
	/**
	 * Unbinds a callback from an event
	 * @param {string} event - Keys pressed in event
	 * @param {Function} callback - Function to unbind
	 */
	off(event, callback) {
		let events = this.#binds[event];
		if (events.includes(callback)) {
			events.splice(events.indexOf(callback), 1);
		}
	}
	/**
	 * Triggers an event, firing all bound callbacks
	 * @param {string} event - Name of the event
	 * @param {...*} args - Arguments passed to callbacks
	 */
	trigger(event, ...args) {
		// Trigger each event
		if (this.#binds[event]) {
			this.#binds[event].forEach(callback => {
				callback(...args);
			});
		}
	}
}
module.exports = Inputs;
