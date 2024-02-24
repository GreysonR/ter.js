const path = require("path");

module.exports = {
	mode: "production",
	entry: "./src/ter.js",
	output: {
		path: path.resolve(__dirname, "dist"),
		filename: "ter.js",
		clean: true,

		library: {
			name: "ter",
			type: "umd",
			umdNamedDefine: true,
		},
	},
	optimization: {
		minimize: true,
	},
}
