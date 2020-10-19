//@ts-check

import { build } from 'rollup-simple-configer'
import pkg from './package.json'

const input = './src/index.ts'

export default [].concat(
  build(
    input,
    {
      file: pkg.main,
      format: 'cjs',
    },
    { external: ['p-each-series', 'auto-bind'] }
  ),
  build(
    input,
    {
      file: pkg.module,
      format: 'esm',
    },
    { external: ['p-each-series', 'auto-bind'] }
  ),
  build(
    input,
    {
      file: 'dist/umd/strict-async-storage.umd.js',
      format: 'umd',
      name: 'strictAsyncStorage',
    },
    { withMin: true, resolveOnly: ['p-each-series', 'auto-bind'] }
  )
)
