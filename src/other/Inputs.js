
class Inputs {
	constructor() {
		window.addEventListener("keydown", event => this.#handleKeydown.call(this, event));
		window.addEventListener("keyup", event => this.#handleKeyup.call(this, event));
	}
	#handleKeydown(event) {
		if (event.repeat) return;

		let key = event.key.toLowerCase();
		let fullKeyName = (event.ctrlKey ? "ctrl" : "") + (event.altKey ? "alt" : "") + (event.shiftKey ? "shift" : "") + key;

		
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
		
		if (this.#binds[fullKeyName]) {
			this.trigger(fullKeyName, false);
		}
		else if (this.#binds[key]) {
			this.trigger(key, false);
		}
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

	#keysDown = [];
	#triggered = [];
	#binds = {};
	/**
	 * Bind a callback to an event
	 * @param {string} event - Keys pressed in event
	 * @param {Function} callback - Callback run when event is fired
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
