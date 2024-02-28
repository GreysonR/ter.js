const path = require("path");
const minify = process.argv.includes("minify");
const clean = !process.argv.includes("noclean");

module.exports = {
	mode: "production",
	entry: "./src/ter.js",
	output: {
		path: path.resolve(__dirname, "dist"),
		filename: `ter${ minify ? ".min" : "" }.js`,
		clean: clean,

		library: {
			name: "ter",
			type: "umd",
			umdNamedDefine: true,
		},
	},
	optimization: {
		minimize: minify,
	},
}
