# eslint-plugin-re-export-sort

💫 Plugin for sorting re-export. **This plugin only apply to re-export.** 💫 <br/>
⚠️ plugin does not sort export specifiers in re-export statements. ⚠️

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

**First group, then sort alphabetically.**
<br/>
The default group order is `Type-Re-Export` first , followed by `ExportAllDeclaration`, and `ExportNamedDeclaration` last.

- `Type-Re-Export`=> `export type { typeSpecifier } from 'source';`
- `ExportAllDeclaration` => `export * from 'source';`
- `ExportNamedDeclaration` => `export { specifier } from 'source';`

**Once grouping finished, then source part(string after `from`) within each group will be sorted in alphabetical order.**

## Options

<!-- begin auto-generated rules list -->

### spaceBetweenGroup

```json
{
  "rules": {
    "re-export-sort/exports": ["error", {
    	"spaceBetweenGroup" : true | false (default true)
    }]
  }
}
```

if spaceBetweenGroup is `false`, `/n` between group are not injected.

---

**if set true (default)**

```ts
export * from "./List";
export type { ListProps } from "./List";
export { default as List } from "./List";
export * from "./ListItem";
export type { ListItemProps } from "./ListItem";
export { default as ListItem } from "./ListItem";
```

⬇️

```ts
export type { ListProps } from "./List";
export type { ListItemProps } from "./ListItem";

export * from "./List";
export * from "./ListItem";

export { default as List } from "./List";
export { default as ListItem } from "./ListItem";
```

---

**if set false**

```ts
export * from "./List";
export type { ListProps } from "./List";
export { default as List } from "./List";
export * from "./ListItem";
export type { ListItemProps } from "./ListItem";
export { default as ListItem } from "./ListItem";
```

⬇️

```ts
export type { ListProps } from "./List";
export type { ListItemProps } from "./ListItem";
export * from "./List";
export * from "./ListItem";
export { default as List } from "./List";
export { default as ListItem } from "./ListItem";
```

**Currently, options for custom group order are not available. We plan to provide detailed setting within the rule ASAP..😂**

<!-- end auto-generated rules list -->

## License

[MIT](LICENSE)
