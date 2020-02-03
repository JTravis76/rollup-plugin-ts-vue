'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var ts = require('typescript');
var fs = require('fs');
var path = require('path');
var rollupPluginutils = require('rollup-pluginutils');
var resolveId = _interopDefault(require('resolve'));
var NodeSass = _interopDefault(require('node-sass'));

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
    if (fs.existsSync(fp)) {
        return fp;
    }
    var segs = cwd.split(path.sep);
    var len = segs.length;
    while (len--) {
        cwd = segs.slice(0, len).join('/');
        fp = cwd + '/' + filename;
        if (fs.existsSync(fp)) {
            return fp;
        }
    }
    return null;
}
function getCompilerOptionsFromTsConfig(typescript, tsconfigPath) {
    if (tsconfigPath && !fs.existsSync(tsconfigPath.toString())) {
        throw new Error("Could not find specified tsconfig.json at " + tsconfigPath);
    }
    var existingTsConfig = tsconfigPath || findFile(process.cwd(), 'tsconfig.json');
    if (!existingTsConfig) {
        return {};
    }
    var tsconfig = typescript.readConfigFile(existingTsConfig, function (path) { return fs.readFileSync(path, 'utf8'); });
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
            return fs.statSync(dirPath).isDirectory();
        }
        catch (err) {
            return false;
        }
    },
    fileExists: function (filePath) {
        try {
            return fs.statSync(filePath).isFile();
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
    var start = -1;
    var end = -1;
    start = code.indexOf('<template>');
    if (start > -1) {
        end = code.lastIndexOf('</template>');
        template = code.substring(start + 10, end);
        template = template.replace(/(\r\n|\n|\r)/gm, "").replace(/\s+/g, " ").trim();
    }
    start = code.indexOf('<script lang="ts">');
    if (start > -1) {
        end = code.indexOf('</script>');
        script = code.substring(start + 18, end);
    }
    start = code.indexOf('<style lang="scss">');
    if (start > -1) {
        end = code.indexOf('</style>');
        style = code.substring(start + 19, end);
    }
    start = code.indexOf('<style lang="scss" scoped>');
    if (start > -1) {
        end = code.indexOf('</style>');
        style = code.substring(start + 26, end);
        var uid = UID();
        style = style.replace(/\s/g, "");
        var z = void 0;
        var regex1 = RegExp(/\.\w+/, "g");
        while (null != (z = regex1.exec(style))) {
            var cssClass = z[0];
            var uniqueCss = cssClass + "-" + uid;
            style = style.replace(cssClass, uniqueCss);
            var regex2 = RegExp(/class="([^\\"]|\\")*"/, "g");
            while (null != (z = regex2.exec(template.toString()))) {
                var htmlClass = z[0];
                cssClass = cssClass.replace(".", "");
                var newCss = htmlClass.replace(cssClass, uniqueCss);
                template = template.replace(htmlClass, newCss);
            }
        }
        regex1 = RegExp(/(}|;)\w+{/, "g");
        while (null != (z = regex1.exec(style))) {
            var cssClass = z[0];
            var tag = cssClass.replace("}", "").replace("{", "");
            style = style.replace(cssClass, "}" + tag + "." + tag + uid + "{");
            if (cssClass.startsWith(";")) {
                tag = cssClass.replace(";", "");
                style = style.replace(cssClass, ";" + tag + "." + tag + uid + "{");
            }
            var regex2 = RegExp(/<[a-z]\w*>/, "g");
            while (null != (z = regex2.exec(template.toString()))) {
                var htmlTag = z[0];
                if (htmlTag.indexOf("<" + tag + ">") > -1) {
                    var newHtmlCss = htmlTag.replace(">", ' class="' + tag + uid + '">');
                    template = template.replace(htmlTag, newHtmlCss);
                }
            }
            if (tag === "a") {
                template = template.replace(/(<router-link\s)/g, '<router-link class="' + tag + uid + '"');
            }
        }
    }
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
function UID() {
    return (((1 + Math.random()) * 0x10000000) | 0).toString(16).substring(1);
}

var TSLIB_ID = '\0tslib';
function vue(options, scssOptions) {
    if (options === void 0) { options = {}; }
    options = Object.assign({}, options);
    scssOptions = Object.assign({}, scssOptions);
    scssOptions.output = scssOptions.output ? scssOptions.output : "./public/css/vue-bundle.css";
    var filter = rollupPluginutils.createFilter(['*.vue+(|x)', '**/*.vue+(|x)', '*.ts+(|x)', '**/*.ts+(|x)'], ['*.d.ts', '**/*.d.ts']);
    var typescript = options.typescript || ts;
    var tslib = options.tslib ||
        fs.readFileSync(resolveId.sync('tslib/tslib.es6.js', { basedir: __dirname }), 'utf-8');
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
                if (diagnostic.category === ts.DiagnosticCategory.Error) {
                    fatalError = true;
                }
            });
            if (fatalError) {
                throw new Error("There were TypeScript errors transpiling");
            }
            if (path.extname(id) === ".vue" || path.extname(id) === ".ts") {
                var g_dirDepth = 0;
                var p = id.replace(/\//g, '\\');
                p = p.replace(__dirname + "\\", "");
                if (p.startsWith('src')) {
                    g_dirDepth = p.split('\\').length - 2;
                }
                var s = "from \"";
                if (g_dirDepth > 0) {
                    for (var d = 0; d < g_dirDepth; d++) {
                        s += "../";
                    }
                }
                else {
                    s += "./";
                }
                var exp = /(from\s"@\/)/gm;
                transformed.outputText = transformed.outputText.replace(exp, s);
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
                fs.writeFile(dest, css, function (err) {
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

module.exports = vue;
