import filesize from 'rollup-plugin-filesize'
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import { terser } from 'rollup-plugin-terser'
import babel from '@rollup/plugin-babel'
import pkg from './package.json'

const extensions = ['.js', '.jsx', '.ts', '.tsx']

/**
 * @typedef  {import('rollup').OutputOptions} OutputOptions
 */

/**
 * @param {OutputOptions} output
 * @param {rollup.} withMin
 */
const build = (output, withMin = false) => {
  const config = {
    input: './src/index.ts',
    plugins: [
      resolve({ extensions }),
      commonjs(),
      babel({ extensions, include: ['src/**/*'], babelHelpers: 'bundled' }),
    ],
    output: [],
  }

  /**
   * @type {OutputOptions}
   */
  const copy = { ...output }
  if (withMin) {
    copy.file = copy.file.replace(/.js$/, '.min.js')
    config.plugins.push(terser())
  } else {
    copy.sourcemap = true
  }
  config.plugins.push(filesize())
  config.output.push(copy)

  return withMin ? [build(output), config] : config
}

export default [].concat(
  build({
    file: pkg.main,
    format: 'cjs',
  }),
  build({
    file: pkg.module,
    format: 'esm',
  }),
  build(
    {
      file: 'dist/umd/strict-async-storage.umd.js',
      format: 'umd',
      name: 'strictAsyncStorage',
    },
    true
  )
)
