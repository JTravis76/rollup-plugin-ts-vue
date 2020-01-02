
export function convertToTs(code: string): {script: string, style: string} {

    let template = "";
    let script = "";
    let style = "";
    let start = -1;
    let end = -1;

    // Parse Template
    start = code.indexOf('<template>');
    if (start > -1) {
        end = code.lastIndexOf('</template>');
        template = code.substring(start + 10, end);
        //remove whitespaces and return feeds to compress string
        template = template.replace(/(\r\n|\n|\r)/gm,"").replace(/\s+/g," ").trim();
    }

    // Parse Script
    start = code.indexOf('<script lang="ts">');
    if (start > -1) {
        end = code.indexOf('</script>');
        script = code.substring(start + 18, end);
    }
    
    // Parse Style
    start = code.indexOf('<style lang="scss">');
    if (start > -1) {
        end = code.indexOf('</style>');
        style = code.substring(start + 19, end);
    }
    start = code.indexOf('<style lang="scss" scoped>');
    if (start > -1) {
        end = code.indexOf('</style>');
        style = code.substring(start + 26, end);

        /** Start of 'scoped' CSS/Vue Templates 
         * Scoped CSS can be applied to; HTML tag, CSS Class. EX: h1 {} .tooltip {}
         * Element Ids should already be unique. EX: <input id="text-box1" />
        */
        let uid = UID();

        // CSS Class object
        let re = /(\.\w+)/gi;
        let cssClass = re.exec(style.toString());
        if (cssClass !== null) {
            let z = cssClass[0];
            style = style.replace(z, z + "-" + uid);
            //remove starting period
            let s = z.substring(1, z.length);

            /** Find all HTML class attribute in template and replace CSS class with new one */
            re = /class="([^\\"]|\\")*"/g;
            let htmlClass = re.exec(template.toString());
            for (let i = 0; i < htmlClass.length; i++) {
                let u = htmlClass[i].replace(s, cssClass[0] + "-" + uid);
                template = template.replace(htmlClass[i], u);
            }
        }

        // Add CSS Class to HTML tag
        //TODO: check HTML tag for existing class attribute, if so, append it
        let tags = /[a-z][0-9]+\s{/gi.exec(style.toString());
        for (let i = 0; i < tags.length; i++) {
            let exp = "<" + tags[i].replace(" {", "");
            let reArray = new RegExp(exp, 'g').exec(template.toString());
            for (let i = 0; i < reArray.length; i++) {
                template = template.replace(reArray[i], reArray[i] + ' class="' + uid + '"');
            }            
        }
        //TODO:: more work and testing

        /** End of 'scoped' section */
    }
    

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

function UID(): string {
    return (((1 + Math.random()) * 0x10000000) | 0).toString(16).substring(1);
}