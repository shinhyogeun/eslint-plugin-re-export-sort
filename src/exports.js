/**
 * @fileoverview this plugin is for sorting re-export
 * @author shinhyogeun
 */

"use strict";

const utils = require("./utils");

module.exports = {
  meta: {
    type: "layout",
    fixable: "code",
    schema: [
      {
        type: "object",
        properties: {
          spaceBetweenGroup: {
            type: "boolean",
          },
          order: {
            type: "array",
            items: {
              type: "string",
            },
          },
        },
        additionalProperties: false,
      },
    ],
    docs: {
      url: "https://github.com/shinhyogeun/eslint-plugin-re-export-sort#sort-order",
    },
    messages: {
      sort: "Please run autofix to sort re-exports!",
    },
  },
  create: (context) => {
    const { spaceBetweenGroup = true, order = utils.DEFAULT_ORDER } =
      context.options[0] || {};

    const parents = new Set();

    const addParent = (node) => {
      if (isExportFrom(node)) {
        parents.add(node.parent);
      }
    };

    return {
      ExportNamedDeclaration: (node) => {
        // if node is re-export. (Except simple export like export { a, b, c})
        if (node.source != null || node.declaration != null) {
          addParent(node);
        }
      },
      ExportAllDeclaration: addParent,
      "Program:exit": () => {
        for (const parent of parents) {
          for (const chunk of utils.extractChunks(parent, (node) =>
            isPartOfChunk(node)
          )) {
            maybeReportChunkSorting(
              chunk,
              context,
              spaceBetweenGroup,
              utils.checkValidOrder(order)
            );
          }
        }
        parents.clear();
      },
    };
  },
};

function maybeReportChunkSorting(chunk, context, spaceBetweenGroup, order) {
  const sourceCode = context.getSourceCode();

  const items = utils.getExportItems(chunk, sourceCode, () => false);

  const rawSortedItems = utils.sortExportItems(items, order);

  const sortedItems = spaceBetweenGroup
    ? utils.spliceItems(rawSortedItems)
    : [[rawSortedItems]];

  const sorted = utils.stringifySortedItems(sortedItems, items, sourceCode);
  const { start } = items[0];
  const { end } = items[items.length - 1];
  utils.replace(context, sorted, start, end);
}

function isPartOfChunk(node) {
  if (!isExportFrom(node)) {
    return "NotPartOfChunk";
  }

  return "PartOfChunk";
}

// check re-export.
function isExportFrom(node) {
  return (
    (node.type === "ExportNamedDeclaration" ||
      node.type === "ExportAllDeclaration") &&
    node.source != null
  );
}
