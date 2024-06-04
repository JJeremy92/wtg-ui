import babel from 'rollup-plugin-babel';
import resolve from 'rollup-plugin-node-resolve';
import { string } from 'rollup-plugin-string';

const extensions = ['.js', '.ts'];

module.exports = {
    input: 'src/index.ts',
    output: {
        file: 'dist/ko-grid.js',
        format: 'umd',
        name: 'kg',
        globals: {
            jquery: '$',
            knockout: 'ko',
            bowser: 'bowser'
        },
        sourcemap: true
    },
    plugins: [
        resolve({ extensions }),
        string({
            include: '**/*.html'
        }),
        babel({ extensions })
    ],
    external: ['jquery', 'jquery-ui', 'knockout', 'bowser']
};
