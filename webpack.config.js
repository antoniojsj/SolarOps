const HtmlWebpackInlineSourcePlugin = require("html-webpack-inline-source-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const path = require("path");

module.exports = (env, argv) => ({
  mode: argv.mode === "production" ? "production" : "development",

  // This is necessary because Figma's 'eval' works differently than normal eval
  devtool: argv.mode === "production" ? false : "inline-source-map",

  entry: {
    ui: "./src/app/index.tsx", // The entry point for your UI code
    code: "./src/plugin/controller.ts" // The entry point for your plugin code
  },

  module: {
    rules: [
      // Converts TypeScript code to JavaScript
      { 
        test: /\.tsx?$/, 
        use: {
          loader: "ts-loader",
          options: {
            transpileOnly: true,
            ignoreDiagnostics: [2580, 2532, 2339]
          }
        }, 
        exclude: /node_modules/ 
      },

      // Enables including CSS by doing "import './file.css'" in your TypeScript code
      {
        test: /\.css$/,
        loader: [{ loader: "style-loader" }, { loader: "css-loader" }]
      },

      // Configuração para arquivos SVG
      {
        test: /\.svg$/,
        use: [
          {
            loader: '@svgr/webpack',
            options: {
              svgo: false, // Desabilita o SVGO se não for necessário
            },
          },
        ],
      },
      // Configuração para outros tipos de imagem
      { 
        test: /\.(png|jpg|gif|webp)$/, 
        use: [
          {
            loader: 'url-loader',
            options: {
              limit: 8192, // Converte para base64 se for menor que 8KB
              name: 'images/[name].[ext]',
            },
          },
        ],
      }
    ]
  },

  // Webpack tries these extensions for you if you omit the extension like "import './file'"
  resolve: { extensions: [".tsx", ".ts", ".jsx", ".js"] },

  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "dist") // Compile into a folder called "dist"
  },

  // Tells Webpack to generate "ui.html" and to inline "ui.ts" into it
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/app/index.html",
      filename: "ui.html",
      inlineSource: ".(js)$",
      chunks: ["ui"]
    }),
    new HtmlWebpackInlineSourcePlugin(),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'public', to: '' }
      ]
    })
  ],

  // Optimization settings for production - simplified to avoid conflicts
  optimization: {
    minimize: argv.mode === "production",
    splitChunks: false,
    concatenateModules: false
  }
});
