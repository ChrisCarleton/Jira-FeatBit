/* eslint-disable */
'use strict';

const path = require('path');

/** @type {import('webpack').Configuration} */
module.exports = {
  mode: 'production',
  target: 'node',
  entry: './src/index.ts',
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, '../../dist'),
    libraryTarget: 'commonjs2',
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: 'tsconfig.json',
            transpileOnly: false,
          },
        },
        exclude: /node_modules/,
      },
    ],
  },
  externals: {
    '@forge/api': 'commonjs @forge/api',
    '@forge/resolver': 'commonjs @forge/resolver',
    '@forge/kvs': 'commonjs @forge/kvs',
    '@forge/bridge': 'commonjs @forge/bridge',
  },
  optimization: {
    minimize: false,
  },
  devtool: 'source-map',
};
