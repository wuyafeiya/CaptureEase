import { terser } from 'rollup-plugin-terser';
import cleanup from 'rollup-plugin-cleanup';

export default {
  input: {
    background: 'background.js',
    content: 'content.js',
    popup: 'popup.js',
  },
  output: {
    dir: 'dist',
    format: 'es',
    entryFileNames: '[name].js',
  },
  plugins: [
    cleanup({
      comments: 'none',
      include: ['**/*.js'],
      compactComments: false,
      lineEndings: 'unix',
      maxEmptyLines: 0,
      extensions: ['.js'],
      sourcemap: false
    }),
    terser({
      compress: {
        drop_console: true,
        pure_funcs: ['console.log']
      }
    })
  ],
};
