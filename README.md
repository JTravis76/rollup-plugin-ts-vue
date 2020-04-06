# Rollup-Plugin-Ts-Vue

Plugin for Rollup to bundle Vue components written in TypeScript.

This plugin was in inspired by [rollup-plugin-typescript](https://github.com/rollup/rollup-plugin-typescript), which uses Typescript's API. Added support for SCSS and Vue.

Feel free to use my full boilerplate project [here on Github](https://github.com/JTravis76/vue-base-template).

## Why
Why another plugin?? I love writing in Typescript and love the Vue single component concept. However, the similar plugins rely on other tools to complete the job. Wanted a way to reduce over-head of other tool-sets like; Babel, Webpack, etc. and replace with a simpler tool.

> NOTE: currently `scoped` styles are **partially** supported and in-beta. Work-in-Progess

## Rollup Config

```ts
import resolve from "./node_modules/@rollup/plugin-node-resolve/dist/index.es";
import vue from "./node_modules/rollup-plugin-ts-vue/dist/rollup-plugin-ts-vue.es";

export default {
    input: "./src/main.ts",
    output: {
        name: "app",
        format: "iife",
        file: "./public/js/app.js",
        globals: {
            "vue": "Vue",
            "vue-router": "VueRouter",
            "vuex": "Vuex",
            "vue-property-decorator": "VueClassComponent",
            "vue-class-component": "VueClassComponent"
            "axios": "axios"
        },
        sourcemap: true,
        sourcemapFile: "./public/js/app.js.map"
    },
    plugins: [
        resolve(),
        // null == defaults to tsconfig.json
        vue(null, {
            output: "./public/css/site.css",
            includePaths: ["src/scss"]
        })
    ],
    external: [
        "vue", 
        "vue-router", 
        "vuex", 
        "vue-class-component",
        "axios"
    ]
}
```
## Examples

*Standard Vue Mixin Object*
```html
<template>
    <div>{{msg}}</div>
</template>

<script lang="ts">
import Vue, { ComponentOptions } from "vue";

export default {
    data() {
        return {
            msg: "Hello World"
        }
    }
} as ComponentOptions<any>
</script>

<style lang="scss">
</style>
```

*Vue Extend*
```html
<template>
    <div>{{msg}}</div>
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
    data() {
        return {
            msg: "Hello World"
        }
    },
    created() {
        let vm = this as VueComp;
        vm.msg = "Hello World Too!!";
    }
});

interface VueComp extends Vue {
    msg: string;
}
</script>

<style lang="scss">
$myColor = blue;

div {
    color: $myColor;
}
</style>
```

*vue-property-decorator*
```html
<template>
    <div>{{msg}}</div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";

@Component
export default class Component1 extends Vue {    
    msg: string = "Hello World";

    created() {
        this.msg = "Hello World Too!!";
        console.log(Created: life-cycle hook);
    }
}
</script>

<style lang="scss">
div {
    color: blue;
    
    a {
        color: green;
    }
}
</style>
```

## Typescript Path Translation
When using paths in tsconfig, rollup doesn't understand how to translate so it may resolve the module. When using something like this; `import MyMod from "@/components/my-module"`. Rollup will assuming its an external dependencies.

```json
{
    ...

    "baseUrl": ".",
    "paths": {
      "@/*": [ "src/*" ]
    }

    ...
}
```

## Change Log

* 0.1.0 inital release
* 0.2.0 fix nested template tags being removed.
* 0.3.0 scoped CSS (beta) and Typescript Path Translation.
* 0.4.0 include `sass` compiler into project vs using another plugin. Also switch from `node-sass` to `sass` due to tar@2.0 errors.