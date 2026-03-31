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
    path: path.resolve(__dirname, 'dist'),
    // Forge expects CommonJS exports
    libraryTarget: 'commonjs2',
    // Don't mangle names – makes Forge error messages readable
    // and matches how Forge itself bundles
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
            // Type-check is handled separately (tsc --noEmit or forge lint)
            transpileOnly: false,
          },
        },
        exclude: /node_modules/,
      },
    ],
  },
  // Forge provides these at runtime – don't bundle them
  externals: {
    '@forge/api': 'commonjs @forge/api',
    '@forge/resolver': 'commonjs @forge/resolver',
    '@forge/kvs': 'commonjs @forge/kvs',
    '@forge/bridge': 'commonjs @forge/bridge',
  },
  optimization: {
    // Keep output readable for debugging
    minimize: false,
  },
  devtool: 'source-map',
};
