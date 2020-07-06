
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
    // TODO: could have addtional style blocks
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
        const uid = UID();
        //remove all whitespaces
        style = style.replace(/\s/g, "");

        //== CSS Class; .home { } convert to .home-abc1234 { }
        let z;
        let regex1 = RegExp(/\.\w+/, "g");
        while (null != (z = regex1.exec(style) )) {
            let cssClass = z[0] as string;
            let uniqueCss = cssClass + "-" + uid;
            style = style.replace(cssClass, uniqueCss);
            
            /** Find all HTML class attribute in template and replace CSS class with new one */
            let regex2 = RegExp(/class="([^\\"]|\\")*"/, "g");
            while (null != (z = regex2.exec(template.toString()))) {
                let htmlClass = z[0] as string;
                //remove starting period
                cssClass = cssClass.replace(".", "");

                //update css class with newly unique css class
                let newCss = htmlClass.replace(cssClass, uniqueCss);
                template = template.replace(htmlClass, newCss);
                
            }
        }
        //== CSS Tag;  p { } convert to p.pabc123 { }
        // Create a css class and append to html tag
        regex1 = RegExp(/(}|;)\w+{/, "g");
        while (null != (z = regex1.exec(style))) {
           let cssClass = z[0] as string;
           let tag = cssClass.replace("}", "").replace("{", "");
           style = style.replace(cssClass, "}" + tag + "." + tag + uid + "{");
           if (cssClass.startsWith(";")) {
               tag = cssClass.replace(";", "");
               style = style.replace(cssClass, ";" + tag + "." + tag + uid + "{");
           }

            // Find HTML tag (straight tag without CSS class ); <p> <div> <span> <h1>, etc
            let regex2 = RegExp(/<[a-z]\w*>/, "g");
            while (null != (z = regex2.exec(template.toString()))) {
                let htmlTag = z[0] as string;
                if (htmlTag.indexOf("<" + tag + ">") > -1) {
                    let newHtmlCss = htmlTag.replace(">", ' class="' + tag + uid + '">');
                    template = template.replace(htmlTag, newHtmlCss);
                }
            }

            // check for anchor tag, then add CSS class to all <router-link >s
            //TODO: need to check if existing class attribute
            if (tag === "a") {
                template = template.replace(/(<router-link\s)/g, '<router-link class="' + tag + uid + '"');
            }
        }
        //console.log(template);
        //TODO: append css class list for scoped html tag
        //TODO: include starting css tag with scoped; div{}h1{} (div is currently not picked up by RegEx)

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