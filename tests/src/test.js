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

ruleTester.run("re-export2", plugin.rules.exports, {
  valid: [
    `
    export * from "./List";
    export * from "./ListItem";
    export * from "./ListItemAvatar";
    export * from "./ListItemButton";
    export * from "./ListItemIcon";
    export * from "./ListItemSecondaryAction";
    export * from "./ListItemText";
    export * from "./ListSubheader";
    export * from "./ListView";
    export * from "./Menu";
    export * from "./MenuItem";
    export * from "./TransferList";

    export { default as List } from "./List";
    export { default as ListItem } from "./ListItem";
    export { default as ListItemAvatar } from "./ListItemAvatar";
    export { default as ListItemButton } from "./ListItemButton";
    export { default as ListItemIcon } from "./ListItemIcon";
    export { default as ListItemSecondaryAction } from "./ListItemSecondaryAction";
    export { default as ListItemText } from "./ListItemText";
    export { default as ListSubheader } from "./ListSubheader";
    export { default as ListView } from "./ListView";
    export { default as Menu } from "./Menu";
    export { default as MenuItem } from "./MenuItem";
    export { default as TransferList } from "./TransferList";
    `,
  ],
  invalid: [],
});
