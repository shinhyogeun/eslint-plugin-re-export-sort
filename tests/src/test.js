"use strict";

var plugin = require("../../src"),
  RuleTester = require("eslint").RuleTester;

RuleTester.setDefaultConfig({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: "module",
  },
});

var ruleTester = new RuleTester();
ruleTester.run("re-export", plugin.rules.exports, {
  valid: [
    `
        export * from './A';
        export * from './D';
        export * from './E';
        export * from './F';        
        export { default as BItem } from './B';
        export { default as CItem } from './C';  
    `,
  ],
  invalid: [],
});

// export * from "A";
// // this is for Grouping2
// // this is for Grouping2
// export * from "B"; // this is after of B
// export { default as AItem } from "A";
// /**
//  * this is for Grouping3
//  */
// const a = 123;
// export { default as BItem } from "B";
// // this is for Grouping4
// export { a, b, c, d } from "C";
