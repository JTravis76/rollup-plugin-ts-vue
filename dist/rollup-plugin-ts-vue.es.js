import * as ts from 'typescript';
import { DiagnosticCategory } from 'typescript';
import { existsSync, readFileSync, statSync, writeFile } from 'fs';
import { sep } from 'path';
import { createFilter } from 'rollup-pluginutils';
import resolveId from 'resolve';
import NodeSass from 'node-sass';

function getDefaultOptions() {
    return {
        noEmitHelpers: true,
        module: 'ESNext',
        sourceMap: true,
        importHelpers: true
    };
}
function findFile(cwd, filename) {
    var fp = cwd ? (cwd + '/' + filename) : filename;
    if (existsSync(fp)) {
        return fp;
    }
    var segs = cwd.split(sep);
    var len = segs.length;
    while (len--) {
        cwd = segs.slice(0, len).join('/');
        fp = cwd + '/' + filename;
        if (existsSync(fp)) {
            return fp;
        }
    }
    return null;
}
function getCompilerOptionsFromTsConfig(typescript, tsconfigPath) {
    if (tsconfigPath && !existsSync(tsconfigPath.toString())) {
        throw new Error("Could not find specified tsconfig.json at " + tsconfigPath);
    }
    var existingTsConfig = tsconfigPath || findFile(process.cwd(), 'tsconfig.json');
    if (!existingTsConfig) {
        return {};
    }
    var tsconfig = typescript.readConfigFile(existingTsConfig, function (path) { return readFileSync(path, 'utf8'); });
    if (!tsconfig.config || !tsconfig.config.compilerOptions)
        return {};
    return tsconfig.config.compilerOptions;
}
function adjustCompilerOptions(options) {
    if (typeof options.inlineSourceMap === 'boolean') {
        options.sourceMap = options.inlineSourceMap;
        delete options.inlineSourceMap;
    }
    delete options.declaration;
}

function endsWith(str, tail) {
    return !tail.length || str.slice(-tail.length) === tail;
}

var resolveHost = {
    directoryExists: function (dirPath) {
        try {
            return statSync(dirPath).isDirectory();
        }
        catch (err) {
            return false;
        }
    },
    fileExists: function (filePath) {
        try {
            return statSync(filePath).isFile();
        }
        catch (err) {
            return false;
        }
    }
};

function convertToTs(code) {
    var template = "";
    var script = "";
    var style = "";
    var start = code.indexOf('<template>');
    var end = code.lastIndexOf('</template>');
    template = code.substring(start + 10, end);
    template = template.replace(/(\r\n|\n|\r)/gm, "").replace(/\s+/g, " ").trim();
    start = code.indexOf('<script lang="ts">');
    end = code.indexOf('</script>');
    script = code.substring(start, end).replace('<script lang="ts">', "").replace("</script>", "");
    start = code.indexOf('<style lang="scss">');
    end = code.indexOf('</style>');
    style = code.substring(start, end).replace("<style lang=\"scss\">", "").replace("</style>", "");
    var exp = /\bimport\W+(?:\w+\W+){1,9}?vue-property-decorator\b/gi;
    if (exp.test(script)) {
        exp = /@Component[\s\r\nexport]/gm;
        script = script.replace(exp, "@Component({template:`" + template + "`})");
        exp = /@Component\({}\)/gm;
        script = script.replace(exp, "@Component({template:`" + template + "`})");
        exp = /@Component\({[\s\r\n ]/gm;
        if (exp.test(script) && (/(template:)/gi.test(script) || /(template\s:)/gi.test(script))) {
            console.error("Template already exist!! Can only contains one template.");
            return { script: "", style: "" };
        }
        script = script.replace(exp, "@Component({\ntemplate:`" + template + "`,");
    }
    else {
        script = script.replace("export default {", "export default { \n template:`" + template + "`,");
        script = script.replace("export default Vue.extend({", "export default Vue.extend({ \n template:`" + template + "`,");
    }
    return {
        script: script,
        style: style
    };
}

var TSLIB_ID = '\0tslib';
function vue(options, scssOptions) {
    if (options === void 0) { options = {}; }
    options = Object.assign({}, options);
    scssOptions = Object.assign({}, scssOptions);
    scssOptions.output = scssOptions.output ? scssOptions.output : "./public/css/vue-bundle.css";
    var filter = createFilter(['*.vue+(|x)', '**/*.vue+(|x)', '*.ts+(|x)', '**/*.ts+(|x)'], ['*.d.ts', '**/*.d.ts']);
    var typescript = options.typescript || ts;
    var tslib = options.tslib ||
        readFileSync(resolveId.sync('tslib/tslib.es6.js', { basedir: __dirname }), 'utf-8');
    delete options.typescript;
    delete options.tslib;
    var tsconfig = options.tsconfig === false ? {} : getCompilerOptionsFromTsConfig(typescript, options.tsconfig);
    delete options.tsconfig;
    adjustCompilerOptions(tsconfig);
    adjustCompilerOptions(options);
    options = Object.assign(tsconfig, getDefaultOptions(), options);
    var moduleType = options.module.toUpperCase();
    if (moduleType !== 'ES2015' && moduleType !== 'ES6' && moduleType !== 'ESNEXT' && moduleType !== 'COMMONJS') {
        throw new Error("rollup-plugin-vue: The module kind should be 'ES2015' or 'ESNext, found: '" + options.module + "'");
    }
    var parsed = typescript.convertCompilerOptionsFromJson(options, process.cwd());
    if (parsed.errors.length) {
        parsed.errors.forEach(function (error) { return console.error("rollup-plugin-vue: " + error.messageText); });
        throw new Error("rollup-plugin-vue: Couldn't process compiler options");
    }
    var compilerOptions = parsed.options;
    var styles = [];
    return {
        name: 'vue',
        resolveId: function (importee, importer) {
            if (importee === 'tslib') {
                return TSLIB_ID;
            }
            if (!importer)
                return null;
            importer = importer.split('\\').join('/');
            var result = typescript.nodeModuleNameResolver(importee, importer, compilerOptions, resolveHost);
            if (result.resolvedModule && result.resolvedModule.resolvedFileName) {
                if (endsWith(result.resolvedModule.resolvedFileName, '.d.ts')) {
                    return null;
                }
                return result.resolvedModule.resolvedFileName;
            }
            return null;
        },
        load: function (id) {
            if (id === TSLIB_ID) {
                return tslib;
            }
        },
        transform: function (code, id) {
            if (!filter(id))
                return null;
            if (id.lastIndexOf('.vue') > -1) {
                var obj = convertToTs(code);
                code = obj.script;
                if (obj.style.trim().length > 0) {
                    styles[id] = obj.style;
                }
            }
            var transformed = typescript.transpileModule(code, {
                fileName: id,
                reportDiagnostics: true,
                compilerOptions: compilerOptions
            });
            var diagnostics = transformed.diagnostics ?
                transformed.diagnostics.filter(function (diagnostic) { return diagnostic.code !== 1204; }) : [];
            var fatalError = false;
            diagnostics.forEach(function (diagnostic) {
                var message = typescript.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
                if (diagnostic.file) {
                    var _a = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start), line = _a.line, character = _a.character;
                    console.error(diagnostic.file.fileName + "(" + (line + 1) + "," + (character + 1) + "): error TS" + diagnostic.code + ": " + message);
                }
                else {
                    console.error("Error: " + message);
                }
                if (diagnostic.category === DiagnosticCategory.Error) {
                    fatalError = true;
                }
            });
            if (fatalError) {
                throw new Error("There were TypeScript errors transpiling");
            }
            return {
                code: transformed.outputText,
                map: transformed.sourceMapText ? JSON.parse(transformed.sourceMapText) : null
            };
        },
        generateBundle: function (opts) {
            var scss = "";
            for (var id in styles) {
                scss += styles[id];
            }
            if (scss.length > 0) {
                var css = NodeSass.renderSync(Object.assign({
                    data: scss
                }, null)).css.toString();
                var dest = scssOptions.output;
                writeFile(dest, css, function (err) {
                    if (err) {
                        console.error(red(err.message));
                    }
                    else if (css) {
                        console.log(green(dest), getSize(css.length));
                    }
                });
            }
        }
    };
}
function red(text) {
    return '\x1b[1m\x1b[31m' + text + '\x1b[0m';
}
function green(text) {
    return '\x1b[1m\x1b[32m' + text + '\x1b[0m';
}
function getSize(bytes) {
    return bytes < 10000
        ? bytes.toFixed(0) + ' B'
        : bytes < 1024000
            ? (bytes / 1024).toPrecision(3) + ' kB'
            : (bytes / 1024 / 1024).toPrecision(4) + ' MB';
}

export default vue;
