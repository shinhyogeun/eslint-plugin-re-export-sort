# eslint-plugin-re-export-sort

💫 this plugin is for sorting re-export 💫

## Example

```ts
export * from "./List";
export type { ListProps } from "./List";
export { default as List } from "./List";
export * from "./ListItem";
export type { ListItemProps } from "./ListItem";
export { default as ListItem } from "./ListItem";
export * from "./ListItemAvatar";
export type { ListItemAvatarProps } from "./ListItemAvatar";
export { default as ListItemAvatar } from "./ListItemAvatar";
export * from "./Menu";
export type { MenuProps } from "./Menu";
export { default as Menu } from "./Menu";
export * from "./MenuItem";
export type { MenuItemProps } from "./MenuItem";
export { default as MenuItem } from "./MenuItem";
```

⬇️

```ts
export type { ListProps } from "./List";
export type { ListItemProps } from "./ListItem";
export type { ListAvatarProps } from "./ListItemAvatar";
export type { MenuProps } from "./Menu";
export type { MenuItemProps } from "./MenuItem";
export * from "./List";
export * from "./ListItem";
export * from "./ListItemAvatar";
export * from "./Menu";
export * from "./MenuItem";
export { default as List } from "./List";
export { default as ListItem } from "./ListItem";
export { default as ListItemAvatar } from "./ListItemAvatar";
export { default as Menu } from "./Menu";
export { default as MenuItem } from "./MenuItem";
```

## Installation

You'll first need to install [ESLint](https://eslint.org/):

```sh
npm i eslint --save-dev
```

Next, install `eslint-plugin-re-export-sort`:

```sh
npm install eslint-plugin-re-export-sort --save-dev
```

## Usage

Add `re-export-sort` to the plugins section of your `.eslintrc` configuration file. You can omit the `eslint-plugin-` prefix:

```json
{
  "plugins": ["re-export-sort"]
}
```

Then configure the rules you want to use under the rules section.

```json
{
  "rules": {
    "re-export-sort/exports": "error"
  }
}
```

## Sort order

**First group, then sort alphabetically.** By default, the group order provided is `Type-Re-Export` first, followed by `ExportAllDeclaration`, followed by `ExportNamedDeclaration`.

- `Type-Re-Export`=> `export type { typeSpecifier } from 'source';`
- `ExportAllDeclaration` => `export * from 'source';`
- `ExportNamedDeclaration` => `export { specifier } from 'source';`

**Once the grouping is finished, you will sort within each group in alphabetical order of the source part after from.**

## Rules

<!-- begin auto-generated rules list -->

Currently, custom rules are not available. We plan to provide detailed settings within the rule in the near future.

1. Options for adding spaces between groups
2. Options for custom order about the group order
<!-- end auto-generated rules list -->

## License

[MIT](LICENSE)
