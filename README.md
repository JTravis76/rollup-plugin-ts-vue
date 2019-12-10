# Rollup-Plugin-Ts-Vue

Plugin for Rollup to bundle Vue components written in TypeScript.

## Why
Why another plugin?? I love writing in Typescript and love the Vue single component concept. However, the similar plugins rely on other tools to complete the job. Wanted a way to reduce over-head of other tool-sets like; Babel, Webpack, etc. and replace with a simple one-man job.

> NOTE: currently `scoped` styles are not supported. Work-in-Progess

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