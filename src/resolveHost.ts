import { statSync } from 'fs';
import * as ts from '../node_modules/typescript/lib/typescript';

export default {
	directoryExists ( dirPath ) {
		try {
			return statSync( dirPath ).isDirectory();
		} catch ( err ) {
			return false;
		}
	},
	fileExists ( filePath ) {
		try {
			return statSync( filePath ).isFile();
		} catch ( err ) {
			return false;
		}
	}
} as ts.ModuleResolutionHost;
