// // import * as ts from "typescript";

// // const source = "export default class Avatar extends Vue { }";

// // let result = ts.transpileModule(source, {
// //     compilerOptions: {module: ts.ModuleKind.CommonJS}
// // });

// // console.log(JSON.stringify(result));

// /**minimal compiler */
// import * as ts from "typescript";

// var fs = require("fs");

// var template = "";
// var script = "";
// var style = "";

// function compile(fileNames: string[], options: ts.CompilerOptions): void {
//   let program = ts.createProgram(fileNames, options);

//   let emitResult = program.emit();

//   let allDiagnostics = ts
//     .getPreEmitDiagnostics(program)
//     .concat(emitResult.diagnostics);

//   allDiagnostics.forEach(diagnostic => {
//     if (diagnostic.file) {
//       let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
//         diagnostic.start!
//       );
//       let message = ts.flattenDiagnosticMessageText(
//         diagnostic.messageText,
//         "\n"
//       );
//       console.log(
//         `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`
//       );
//     } else {
//       console.log(
//         `${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`
//       );
//     }
//   });

//   let exitCode = emitResult.emitSkipped ? 1 : 0;
//   console.log(`Process exiting with code '${exitCode}'.`);
//   process.exit(exitCode);
// }

// fs.readFile("C:/Users/KDJ/Desktop/TS compiler/avatar.vue", "utf8", function(err: NodeJS.ErrnoException, contents: string) {
//     var start = contents.indexOf('<template>');
//     var end = contents.lastIndexOf('</template>');
//     template = contents.substring(start, end).replace('<template>',"").replace("</template>","");
//     template = template.replace("\n", "").trim();
//     //console.log(template);
//     //console.log(start, end);

//     start = contents.indexOf('<script lang="ts">');
//     end = contents.indexOf('</script>');
//     script = contents.substring(start, end).replace('<script lang="ts">',"").replace("</script>","");
//     //console.log(script);
//     //console.log(start, end);

//     start = contents.indexOf('<style>');
//     end = contents.indexOf('</style>');
//     style = contents.substring(start, end).replace("<style>","").replace("</style>","");
//     //console.log(style);
//     //console.log(start, end);

//     script = script.replace("export default {", "export default { \n template:`" + template + "`,");

//     /** */
//     // let result = ts.transpileModule(script, {
//     //   compilerOptions: {module: ts.ModuleKind.ES2015}
//     // });

//     // script = JSON.stringify(result);

//     fs.writeFile("node_modules/.tsstaging/avatar.ts", script, function(err: NodeJS.ErrnoException) {
//         console.error(err);

//         compile(["node_modules/.tsstaging/avatar.ts"], {//process.argv.slice(2)
//           noEmitOnError: true,
//           noImplicitAny: true,
//           noEmit: true,
//           target: ts.ScriptTarget.ES5,
//           module: ts.ModuleKind.ES2015
//         });
//     });
// });