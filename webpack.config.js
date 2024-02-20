const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
	mode: "development",
	entry: path.resolve(__dirname, "src/ter.js"),
	output: {
		path: path.resolve(__dirname, "dev_dist"),
		filename: "ter.js",
		clean: false,

		library: {
			name: "ter",
			type: "umd",
			umdNamedDefine: true,
		},
	},
	optimization: {
		minimize: false,
	},
	devtool: "source-map",
	devServer: {
		static: {
			directory: path.resolve(__dirname, "dev_dist"),
		},
		port: 80,
		open: true,
		hot: true,
		compress: true,
		historyApiFallback: true,
	},
	plugins: [
		new HtmlWebpackPlugin({
			title: "ter.js",
			filename: "index.html",
			template: "src/ter-test.html",
			scriptLoading: "blocking",
		}),
	]
}
