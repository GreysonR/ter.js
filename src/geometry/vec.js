/**
 * A 2d vector
 */
class vec {
	/**
	 * Creates a new vector
	 * @param {*} x - The x coordinate
	 * @param {*} y  - The y coordinate
	 * @return {vec} `this`
	 */
	constructor(x, y) {
		if (typeof x === "object") {
			if (Array.isArray(x)) {
				this.x = x[0];
				this.y = x[1];
			}
			else {
				this.x = x.x;
				this.y = x.y;
			}
		}
		else if (typeof x === "number" && y === undefined) {
			this.x = Math.cos(x);
			this.y = Math.sin(x);
		}
		else {
			this.x = x;
			this.y = y;
		}

		return this;
	}
	/**
	 * Adds `vec2` to `this`, returning a new vector
	 * @param {vec} vec2 - 
	 * @return {vec} New vector
	 */
	add(vec2) {
		if (typeof vec2 === "number") {
			return new vec(this.x + vec2, this.y + vec2);
		}
		else {
			return new vec(this.x + vec2.x, this.y + vec2.y);
		}
	}
	/**
	 * Subtracts `vec2` from `this`, returning a new vector
	 * @param {vec} vec2 - 
	 * @return {vec} New vector
	 */
	sub(vec2) {
		if (typeof vec2 === "number") {
			return new vec(this.x - vec2, this.y - vec2);
		}
		else {
			return new vec(this.x - vec2.x, this.y - vec2.y);
		}
	}
	/**
	 * Multiplies `this` by `vec2`, returning a new vector
	 * @param {vec} vec2 - 
	 * @return {vec} New vector
	 */
	mult(vec2) {
		if (typeof vec2 === "number") {
			return new vec(this.x * vec2, this.y * vec2);
		}
		else {
			return new vec(this.x * vec2.x, this.y * vec2.y);
		}
	}
	/**
	 * Divides `this` by `vec2`, returning a new vector
	 * @param {vec} vec2 - 
	 * @return {vec} New vector
	 */
	div(vec2) {
		if (typeof vec2 === "number") {
			return new vec(this.x / vec2, this.y / vec2);
		}
		else {
			return new vec(this.x / vec2.x, this.y / vec2.y);
		}
	}
	/**
	 * Adds `vec2` to `this` in place, returning `this`
	 * @param {vec} vec2 - 
	 * @return {vec} `this`
	 */
	add2(vec2) {
		if (typeof vec2 === "number") {
			this.x += vec2;
			this.y += vec2;
			return this;
		}
		else {
			this.x += vec2.x;
			this.y += vec2.y;
			return this;
		}
	}
	/**
	 * Subtracts `vec2` from `this` in place, returning `this`
	 * @param {vec} vec2 - 
	 * @return {vec} `this`
	 */
	sub2(vec2) {
		if (typeof vec2 === "number") {
			this.x -= vec2;
			this.y -= vec2;
			return this;
		}
		else {
			this.x -= vec2.x;
			this.y -= vec2.y;
			return this;
		}
	}
	/**
	 * Multiplies `this` by `vec2` in place, returning `this`
	 * @param {vec} vec2 - 
	 * @return {vec} `this`
	 */
	mult2(vec2) {
		if (typeof vec2 === "number") {
			this.x *= vec2;
			this.y *= vec2;
			return this;
		}
		else {
			this.x *= vec2.x;
			this.y *= vec2.y;
			return this;
		}
	}
	/**
	 * Divides `this` by `vec2` in place, returning `this`
	 * @param {vec} vec2 - 
	 * @return {vec} `this`
	 */
	div2(vec2) {
		if (typeof vec2 === "number") {
			this.x /= vec2;
			this.y /= vec2;
			return this;
		}
		else {
			this.x /= vec2.x;
			this.y /= vec2.y;
			return this;
		}
	}
	/**
	 * Raises `this` to the power of `vec2`
	 * @param {vec} vec2 - 
	 * @return {vec} New vector
	 */
	pow(vec2) {
		if (typeof vec2 === "number") {
			return new vec(this.x ** vec2, this.y ** vec2);
		}
		else {
			return new vec(this.x ** vec2.x, this.y ** vec2.y);
		}
	}
	/**
	 * Raises `this` to the power of `vec2` in place
	 * @param {vec} vec2 - 
	 * @return {vec} `this`
	 */
	pow2(vec2) {
		if (typeof vec2 === "number") {
			this.x = this.x ** vec2;
			this.y = this.y ** vec2;
			return this;
		}
		else {
			this.x = this.x ** vec2.x;
			this.y = this.y ** vec2.y;
			return this;
		}
	}
	/**
	 * Finds the signed values of `x` and `y`
	 * @example
	 * let signed = new vec(4, -2).sign(); // signed = { x: 1, y: -1 }
	 * @return {vec} New vector
	 */
	sign() {
		return new vec(Math.sign(this.x), Math.sign(this.y));
	}
	/**
	 * Finds the signed values of `x` and `y` in place
	 * @example
	 * let signed = new vec(0, -4);
	 * signed.sign2(); // signed = { x: 0, y: -1 }
	 * @return {vec} `this`
	 */
	sign2() {
		this.x = Math.sign(this.x);
		this.y = Math.sign(this.y);
		return this;
	}
	/**
	 * Finds the modulus of `this` and `vec2`
	 * @param {vec} vec2 - 
	 * @example
	 * let mod = new vec(14, 4).mod(new vec(2, 3)); // mod = { x: 0, y: 1 }
	 * @return {vec} New vector
	 */
	mod(vec2) {
		if (typeof vec2 === "number")
			return new vec(this.x % vec2, this.y % vec2);
		return new vec(this.x % vec2.x, this.y % vec2.y);
	}
	/**
	 * Finds the modulus of `this` and `vec2` in place
	 * @param {vec} vec2 - 
	 * @example
	 * let mod = new vec(-2, 6);
	 * mod.mod2(new vec(3, 4)); // mod = { x: -2, y: 2 }
	 * @return {vec} `this`
	 */
	mod2(vec2) {
		if (typeof vec2 === "number") {
			this.x %= vec2;
			this.y %= vec2;
		}
		else {
			this.x %= vec2.x;
			this.y %= vec2.y;
		}
		return this;
	}
	/**
	 * Finds dot product of `this` and `vec2`
	 * @param {vec} vec2 - 
	 * @return {vec} New vector
	 */
	dot(vec2) {
		return this.x * vec2.x + this.y * vec2.y;
	}
	/**
	 * Finds 2d cross product of `this` and `vec2`
	 * @param {vec} vec2 - 
	 * @return {vec} New vector
	 */
	cross(vec2) {
		if (typeof vec2 === "number") {
			return new vec(-vec2 * this.y, vec2 * this.x);
		}
		else {
			return this.x * vec2.y - this.y * vec2.x;
		}
	}
	/**
	 * Finds average of `this` and `vec2`
	 * @param {vec} vec2 - Second vector
	 * @param {number} weight - The weight that `this` has in the average
	 * @return {vec} New vector
	 */
	avg(vec2, weight = 0.5) {
		let weight2 = 1 - weight;
		return new vec(this.x * weight + vec2.x * weight2, this.y * weight + vec2.y * weight2);
	}
	/**
	 * Finds the length of `this`
	 * @return {number} Length
	 */
	get length() {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}
	/**
	 * Sets the length of `this`, keeping its direction the same
	 * @param {number} len - The new length
	 * @example
	 * let v = new vec(1, 1);
	 * v.length = 10; // v = { x: 7.07, y: 7.07 }
	 * @return {vec} `this`
	 */
	set length(len) {
		let scale = len / this.length;
		this.x *= scale;
		this.y *= scale;

		return this;
	}
	/**
	 * Finds the angle of `this`
	 * @return {number} Angle, in radians
	 */
	get angle() {
		return Math.atan2(this.y, this.x);
	}
	/**
	 * Finds area of the rectangle created by `this`
	 * @return {number} Area
	 */
	get area() {
		return this.x * this.y;
	}
	/**
	 * Finds the manhattan distance (x + y) between `vec` and `this`
	 * @param {vec} vec2
	 * @return {number} Distnace
	 */
	manhattan(vec2) {
		return Math.abs(vec2.x - this.x) + Math.abs(vec2.y - this.y);
	}
	/**
	 * Takes the absolute value of `x` and `y`
	 * @return {vec} New vector
	 */
	abs() {
		return new vec(Math.abs(this.x), Math.abs(this.y));
	}
	/**
	 * Takes the absolute value of `x` and `y` in place
	 * @return {vec} `this`
	 */
	abs2() {
		this.x = Math.abs(this.x);
		this.y = Math.abs(this.y);
		return this;
	}
	/**
	 * Reflects `this` over `vec2`. `vec2` must be normalized
	 * @param {vec} vec2 - Normalized vector reflected across
	 * @return {vec} New reflected vector
	 */
	reflect(vec2) { // vec2 must be normalized
		// Vect2 = Vect1 - 2 * WallN * (WallN DOT Vect1)
		let v2 = vec2.normal();
		return this.sub(v2.mult(v2.dot(this) * 2));
	}
	/**
	 * Reflects `this` over `vec2` in place. `vec2` must be normalized
	 * @param {vec} vec2 - Normalized vector reflected across
	 * @return {vec} `this`
	 */
	reflect2(vec2) { // vec2 must be normalized
		let v2 = vec2.normal();
		return this.sub2(v2.mult(v2.dot(this) * 2));
	}
	/**
	 * Rotates `this` by `angle`
	 * @param {number} angle - Angle rotated by, in radians
	 * @return {vec} New rotated vector
	 */
	rotate(angle) {
		return new vec(Math.cos(angle) * this.x - Math.sin(angle) * this.y, Math.sin(angle) * this.x + Math.cos(angle) * this.y);
	}
	/**
	 * Rotates `this` by `angle` in place
	 * @param {number} angle - Angle rotated by, in radians
	 * @return {vec} `this`
	 */
	rotate2(angle) {
		let x = Math.cos(angle) * this.x - Math.sin(angle) * this.y;
		this.y = Math.sin(angle) * this.x + Math.cos(angle) * this.y;
		this.x = x;
		return this;
	}
	/**
	 * Projects `this` onto `vec2`
	 * @param {vec} vec2 - Vector projected onto
	 * @param {boolean} [bound=false] - If the projected vector should be forced between the bounds of `vec2`
	 * @return {vec} New rotated vector
	 */
	project(vec2, bound = false) { // projects this vector onto the other one
		let d1 = this.dot(vec2);
		let d2 = vec2.x * vec2.x + vec2.y * vec2.y;

		if (bound) {
			d1 = Math.max(0, Math.min(d2, d1));
		}

		return new vec(d1 * vec2.x / d2, d1 * vec2.y / d2);
	}
	/**
	 * Projects `this` onto `vec2` in place
	 * @param {vec} vec2 - Vector projected onto
	 * @param {boolean} [bound=false] - If the projected vector should be forced between the bounds of `vec2`
	 * @return {vec} `this`
	 */
	project2(vec2, bound = false) { // projects this vector onto the other one
		let d1 = this.dot(vec2);
		let d2 = vec2.x * vec2.x + vec2.y * vec2.y;

		if (bound) {
			d1 = Math.max(0, Math.min(d2, d1));
		}

		this.x = d1 * vec2.x / d2;
		this.y = d1 * vec2.y / d2;

		return this;
	}
	/**
	 * Normalizes `this`, making its length 1
	 * @return {vec} New vector
	 */
	normalize() {
		let len = this.length;
		if (len === 0) return new vec(this);
		return new vec(this.x / len, this.y / len);
	}
	/**
	 * Normalizes `this` in place, making its length 1
	 * @return {vec} `this`
	 */
	normalize2() {
		let len = this.length;
		if (len === 0) return this;
		this.x /= len;
		this.y /= len;
		return this;
	}
	/**
	 * Finds the left hand normal
	 * @return {vec} New vector
	 */
	normal() { // left hand normal
		return new vec(this.y, -this.x);
	}
	/**
	 * Finds the left hand normal in place
	 * @return {vec} `this`
	 */
	normal2() { // left hand normal
		let y = this.y;
		this.y = -this.x;
		this.x = y;
		return this;
	}
	/**
	 * Rounds `x` and `y` components down
	 * @return {vec} New vector
	 */
	floor() {
		return new vec(Math.floor(this.x), Math.floor(this.y));
	}
	/**
	 * Rounds `x` and `y` components down in place
	 * @return {vec} `this`
	 */
	floor2() {
		this.x = Math.floor(this.x);
		this.y = Math.floor(this.y);
		return this;
	}
	/**
	 * Rounds `x` and `y` components up
	 * @return {vec} New vector
	 */
	ceil() {
		return new vec(Math.ceil(this.x), Math.ceil(this.y));
	}
	/**
	 * Rounds `x` and `y` components up in place
	 * @return {vec} `this`
	 */
	ceil2() {
		this.x = Math.ceil(this.x);
		this.y = Math.ceil(this.y);
		return this;
	}
	/**
	 * Rounds `x` and `y` components
	 * @return {vec} New vector
	 */
	round() {
		return new vec(Math.round(this.x), Math.round(this.y));
	}
	/**
	 * Rounds `x` and `y` components in place
	 * @return {vec} `this`
	 */
	round2() {
		this.x = Math.round(this.x);
		this.y = Math.round(this.y);
		return this;
	}
	/**
	 * Finds  the minimum `x` and `y` components between `this` and `vec2`
	 * @param {vec} vec2
	 * @return {vec} New vector
	 */
	min(vec2) {
		return new vec(Math.min(vec2.x, this.x), Math.min(vec2.y, this.y));
	}
	/**
	 * Finds  the minimum `x` and `y` components between `this` and `vec2` in place
	 * @param {vec} vec2
	 * @return {vec} `this`
	 */
	min2(vec2) {
		this.x = Math.min(this.x, vec2.x);
		this.y = Math.min(this.y, vec2.y);
		return this;
	}
	/**
	 * Finds the maximum `x` and `y` components between `this` and `vec2`
	 * @param {vec} vec2
	 * @return {vec} New vector
	 */
	max(vec2) {
		return new vec(Math.max(vec2.x, this.x), Math.max(vec2.y, this.y));
	}
	/**
	 * Finds the maximum `x` and `y` components between `this` and `vec2` in place
	 * @param {vec} vec2
	 * @return {vec} `this`
	 */
	max2(vec2) {
		this.x = Math.max(this.x, vec2.x);
		this.y = Math.max(this.y, vec2.y);
		return this;
	}
	/**
	 * Clamps `x` and `y` components between `min` and `max`
	 * @param {vec} min
	 * @param {vec} max
	 * @return {vec} New vector
	 */
	clamp(min, max) {
		return new vec(Math.max(min.x, Math.min(max.x, this.x)), Math.max(min.y, Math.min(max.y, this.y)));
	}
	/**
	 * Finds  the maximum `x` and `y` components between `this` and `vec2` in place
	 * @param {vec} min
	 * @param {vec} max
	 * @return {vec} `this`
	 */
	clamp2(min, max) {
		this.x = Math.max(min.x, Math.min(max.x, this.x));
		this.y = Math.max(min.y, Math.min(max.y, this.y));
		return this;
	}
	/**
	 * Checks if `this` equals `vec2`. DOES NOT take into account floating point error.
	 * @param {vec} vec2
	 * @return {boolean}
	 */
	equals(vec2) {
		return this.x === vec2.x && this.y === vec2.y;
	}
	/**
	 * Sets the `x` and `y` components to be the same as `vec2` in place
	 * @param {vec} vec2
	 * @return {vec} `this`
	 */
	set(vec2) {
		this.x = vec2.x;
		this.y = vec2.y;
		return this;
	}
	/**
	 * Creates a string in the format `"{ x : x, y: y }"`
	 * @return {void}
	 */
	toString() {
		return `{ x: ${ this.x }, y: ${ this.y } }`;
	}
	/**
	 * Creates a string in the format `"{ x : x, y: y }"`, with `x` and `y` rounded
	 * @return {void}
	 */
	toStringInt() {
		return `{ x: ${ Math.round(this.x) }, y: ${ Math.round(this.y) } }`;
	}
	/**
	 * Creates js object in the form of `{ x: x, y: y }`
	 * @return {Object}
	 */
	toObject() {
		return { x: this.x, y: this.y };
	}
	/**
	 * Creates a array in the format `[x, y]`
	 * @return {void}
	 */
	toArray() {
		return [this.x, this.y];
	}
	/**
	 * Finds if any part of the vector is NaN
	 * @return {boolean}
	 */
	isNaN() {
		return isNaN(this.x) || isNaN(this.y);
	}
}
module.exports = vec;
