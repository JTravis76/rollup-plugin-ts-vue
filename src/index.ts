import * as ts from 'typescript';
import * as fs from "fs";
import { getCompilerOptionsFromTsConfig, adjustCompilerOptions, getDefaultOptions } from './options.js';
import { createFilter } from 'rollup-pluginutils';
import { endsWith } from './string';
import resolveHost from './resolveHost';
import resolveId from 'resolve';
import {convertToTs} from "./vue-converter";
//import NodeSass from "node-sass";
import sass from "sass";
import * as path from "path";

const TSLIB_ID = '\0tslib';

export default function vue (options:IOptions = {}, scssOptions:IScssOptions) {
	options = Object.assign({}, options);
	scssOptions = Object.assign({}, scssOptions);

    scssOptions.output = scssOptions.output ? scssOptions.output : "./dist/css/site.css";
    scssOptions.includePaths = scssOptions.includePaths ? scssOptions.includePaths : ["src/scss"]

    const filter = createFilter(
		[ '*.vue+(|x)', '**/*.vue+(|x)','*.ts+(|x)', '**/*.ts+(|x)', '**/*.css', '*.sass', '**/*.scss' ],
		[ '*.d.ts', '**/*.d.ts' ] );

    const typescript = options.typescript || ts;
    const tslib = options.tslib ||
		fs.readFileSync(resolveId.sync('tslib/tslib.es6.js', { basedir: __dirname }), 'utf-8' );

	delete options.typescript;
	delete options.tslib;

    // Load options from `tsconfig.json` unless explicitly asked not to.
	const tsconfig = options.tsconfig === false ? {} : getCompilerOptionsFromTsConfig( typescript, options.tsconfig );
    delete options.tsconfig;

    // Since the CompilerOptions aren't designed for the Rollup
	// use case, we'll adjust them for use with Rollup.
	adjustCompilerOptions( tsconfig );
    adjustCompilerOptions( options );
    
    options = Object.assign( tsconfig, getDefaultOptions(), options );

    // Verify that we're targeting ES2015 modules.
	const moduleType = options.module.toUpperCase();
	if ( moduleType !== 'ES2015' && moduleType !== 'ES6' && moduleType !== 'ESNEXT' && moduleType !== 'COMMONJS' ) {
		throw new Error( `rollup-plugin-vue: The module kind should be 'ES2015' or 'ESNext, found: '${ options.module }'` );
    }
    
    const parsed = typescript.convertCompilerOptionsFromJson( options, process.cwd() );

	if ( parsed.errors.length ) {
		parsed.errors.forEach( error => console.error( `rollup-plugin-vue: ${ error.messageText }` ) );

		throw new Error( `rollup-plugin-vue: Couldn't process compiler options` );
    }
    
	const compilerOptions = parsed.options;
	const styles = [];

	return {
		name: 'vue',

		resolveId ( importee, importer ) {
			if ( importee === 'tslib' ) {
				return TSLIB_ID;
			}

			if ( !importer ) return null;
			importer = importer.split('\\').join('/');

			const result = typescript.nodeModuleNameResolver(importee, importer, compilerOptions, resolveHost);

			if ( result.resolvedModule && result.resolvedModule.resolvedFileName ) {
				if ( endsWith( result.resolvedModule.resolvedFileName, '.d.ts' ) ) {
					return null;
				}

				return result.resolvedModule.resolvedFileName;
			}

			return null;
		},

		load ( id ) {
			if ( id === TSLIB_ID ) {
				return tslib;
			}
		},

		transform ( code: string, id: string ) {
			if ( !filter( id ) ) return null;

			// if vue file, run through processor to parse out script and style sections
			if ( id.lastIndexOf('.vue') > -1)  {
				let obj = convertToTs(code);
				code = obj.script;

				if (obj.style.trim().length > 0) {
                    styles[id] = obj.style;
                }
            }
            else if (id.lastIndexOf('.scss') > -1) {
                styles[id] = code;
                //return with a comment so rollup is happy that we process something
                return { code: "//== Adding css styles ==", map: null };
            }

			const transformed = typescript.transpileModule( code, {
				fileName: id,
				reportDiagnostics: true,
				compilerOptions
			});

			// All errors except `Cannot compile modules into 'es6' when targeting 'ES5' or lower.`
			const diagnostics = transformed.diagnostics ?
				transformed.diagnostics.filter( diagnostic => diagnostic.code !== 1204 ) : [];

			let fatalError = false;

			diagnostics.forEach( diagnostic => {
				const message = typescript.flattenDiagnosticMessageText(diagnostic.messageText, '\n');

				if ( diagnostic.file ) {
					const { line, character } = diagnostic.file.getLineAndCharacterOfPosition( diagnostic.start );

					console.error( `${diagnostic.file.fileName}(${line + 1},${character + 1}): error TS${diagnostic.code}: ${message}` );
				} else {
					console.error( `Error: ${message}` );
				}

				if ( diagnostic.category === ts.DiagnosticCategory.Error ) {
					fatalError = true;
				}
			});

			if ( fatalError ) {
				throw new Error( `There were TypeScript errors transpiling` );
            }
            
            /**
             * When using Paths in tsconfig, Rollup cannot translate.
             * Below calculate and returns the directory depth.
             * Concat the 'N' depth to match the related path for rollup to understand.
             * EX: 'from "@/components/index"' TO 'from "../../components/index"'
             */
            if (path.extname(id) === ".vue" || path.extname(id) === ".ts") {
                let g_dirDepth = 0;
                // fix all slashes and remove root directory
                let p = id.replace(/\//g, '\\');
                p = p.replace(__dirname + "\\", "");

                if (p.startsWith('src')) {
                    g_dirDepth = p.split('\\').length - 2;
                }

                let s = "from \"";
                if (g_dirDepth > 0) {
                    for (let d = 0; d < g_dirDepth; d++) {
                        s += "../";
                    }
                }
                else {
                    s += "./";
                }

                let exp = /(from\s"@\/)/gm;
                transformed.outputText = transformed.outputText.replace(exp, s);
            }

			return {
				code: transformed.outputText,

				// Rollup expects `map` to be an object so we must parse the string
				map: transformed.sourceMapText ? JSON.parse(transformed.sourceMapText) : null
			};
		},
		generateBundle(opts: any) {
            //console.log(opts);

            let scss = "";
            for (const id in styles) {
                scss += styles[id];
            }

            if (scss.length > 0) {
                // let css = NodeSass.renderSync(Object.assign({
                //     data: scss
                // }, null)).css.toString();

                let css = sass.renderSync({
                    data: scss,
                    includePaths: scssOptions.includePaths
                }).css.toString();
            
                let dest = scssOptions.output;
                fs.writeFile(dest, css, (err) => {
                    if (err) {
                        console.error(red(err.message))      
                    } else if (css) {      
                        console.log(green(dest), getSize(css.length))      
                    }
                });
            }
        }
	};
}

function red (text: string): string {
    return '\x1b[1m\x1b[31m' + text + '\x1b[0m'  
}

function green (text: string): string {  
    return '\x1b[1m\x1b[32m' + text + '\x1b[0m'  
}
  
function getSize (bytes: number): string {  
    return bytes < 10000  
        ? bytes.toFixed(0) + ' B'  
        : bytes < 1024000  
        ? (bytes / 1024).toPrecision(3) + ' kB'  
        : (bytes / 1024 / 1024).toPrecision(4) + ' MB'  
}


interface IOptions {
    typescript?: any;
    tsconfig?: boolean | string;
    module?: string;
    tslib?: any;
}

interface IScssOptions {
    output?: string;
    includePaths?: string[];
}