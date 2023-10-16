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
    schema: [],
    docs: {
      url: "not yet",
    },
    messages: {
      sort: "Please run autofix to sort re-exports!",
    },
  },
  create: (context) => {
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
            maybeReportChunkSorting(chunk, context);
          }
        }
        parents.clear();
      },
    };
  },
};

function maybeReportChunkSorting(chunk, context) {
  const sourceCode = context.getSourceCode();

  const items = utils.getExportItems(chunk, sourceCode, () => false);

  // 여기서 items 순서를 *, {}, type을 내가 이쁘게 만들자..!
  const sortedItems = [[utils.sortImportExportItems(items)]];
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
