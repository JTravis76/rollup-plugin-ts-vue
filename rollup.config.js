import typescript from "@rollup/plugin-typescript";
import pkg from './package.json';

export default {
	input: 'src/index.ts',

	external: [
		'path',
		'fs',
		'resolve',
		'rollup-pluginutils',
		'typescript',
        'node-sass',
        'sass'
	],

	plugins: [
        typescript()
	],

	output: [
		{
			format: 'cjs',
			file: pkg.main
		},
		{
			format: 'es',
			file: pkg.module
		}
	]
};
