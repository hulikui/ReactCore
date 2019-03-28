const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const fs = require('fs')

module.exports = {
  entry: [require.resolve('./index.js')],

  output: {
    filename: 'dist/react-index.js'
  },

  resolve: {
    extensions: ['.js']
  },

  devtool: 'source-map',

  module: {
    rules: [
      {
        test: /\.js$/,
        use: ['babel-loader'],
        include: path.resolve(__dirname, './')
      },
      {
        test: /\.less$/,
        use: [
          'style-loader',
          { loader: 'css-loader', options: { importLoaders: 1 } },
          { loader: 'postcss-loader',
            options: {config: {path: path.join(__dirname, '/postcss.config.js')}}},
          'less-loader'
        ]
      },
      {
        test: /\.svg$/,
        loader: 'svg-inline-loader'
      },
      {
        test: /\.(gif|jpg|png|woff|eot|ttf)\??.*$/,
        loader: 'url-loader'
      }
    ]
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: require.resolve('./public/index.html')
    })
  ],
  devServer: {
    hot: true,
    disableHostCheck: true,
    host: '0.0.0.0',
    port: 8888
  }
}
