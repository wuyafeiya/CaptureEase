import { terser } from 'rollup-plugin-terser';

export default {
  input: {
    background: 'background.js',
    content: 'content.js',
    popup: 'popup.js',
  },
  output: {
    dir: 'dist',
    format: 'es', // 使用 ES 模块格式，支持代码拆分
    entryFileNames: '[name].js',
  },
  plugins: [terser()],
};
