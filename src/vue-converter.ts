
export function convertToTs(code: string): {script: string, style: string} {

    var template = "";
    var script = "";
    var style = "";

    // Parse Template
    var start = code.indexOf('<template>');
    var end = code.lastIndexOf('</template>');
    template = code.substring(start, end).replace('<template>',"").replace("</template>","");
    template = template.replace(/(\r\n|\n|\r)/gm,"").replace(/\s+/g," ").trim();

    // Parse Script
    start = code.indexOf('<script lang="ts">');
    end = code.indexOf('</script>');
    script = code.substring(start, end).replace('<script lang="ts">',"").replace("</script>","");
    
    // Parse Style
    start = code.indexOf('<style lang="scss">');
    end = code.indexOf('</style>');
    style = code.substring(start, end).replace("<style lang=\"scss\">","").replace("</style>","");

    // Are we using 'vue-property-decorator' ??
    let exp = /\bimport\W+(?:\w+\W+){1,9}?vue-property-decorator\b/gi;
    if(exp.test(script)) {
        // Simple @Component attribute (inline, space, or newline/return feed)
        exp = /@Component[\s\r\nexport]/gm;
        script = script.replace(exp, "@Component({template:`" + template + "`})");
        // @Component attribute with empty properties
        exp = /@Component\({}\)/gm;
        script = script.replace(exp, "@Component({template:`" + template + "`})");
        // @Component attribute with propert(ies)
        exp = /@Component\({[\s\r\n ]/gm;
        // If Component has propert(ies) and one is a template, throw error            
        if (exp.test(script) && (/(template:)/gi.test(script) || /(template\s:)/gi.test(script))) {
            console.error("Template already exist!! Can only contains one template.");
            return { script: "", style: "" };
        }            
        script = script.replace(exp, "@Component({\ntemplate:`" + template + "`,");
    }
    else {
        // Insert Template into Vue's mixin
        script = script.replace("export default {", "export default { \n template:`" + template + "`,");
        script = script.replace("export default Vue.extend({", "export default Vue.extend({ \n template:`" + template + "`,");
    }

    return {
        script,
        style
    };
}