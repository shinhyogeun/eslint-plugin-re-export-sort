"use strict";

const DEFAULT_ORDER = ["type", "all", "name"];

function spliceItems(items) {
  let itemsArr = [];
  let tempArr = [];

  items.forEach((item, itemIndex) => {
    if (itemIndex === 0) {
      tempArr.push(item);
    } else {
      if (
        item.source.kind === items[itemIndex - 1].source.kind &&
        item.node.type === items[itemIndex - 1].node.type
      ) {
        tempArr.push(item);
      } else if (
        item.source.kind === items[itemIndex - 1].source.kind &&
        item.source.kind === "type"
      ) {
        tempArr.push(item);
      } else {
        itemsArr.push([[...tempArr]]);
        tempArr = [item];
      }
    }
  });

  itemsArr.push([[...tempArr]]);

  return itemsArr;
}

function extractChunks(parentNode, isPartOfChunk) {
  const chunks = [];
  let chunk = [];
  let lastNode = undefined;

  for (const node of parentNode.body) {
    const result = isPartOfChunk(node, lastNode);
    switch (result) {
      case "PartOfChunk":
        chunk.push(node);
        break;

      case "PartOfNewChunk":
        if (chunk.length > 0) {
          chunks.push(chunk);
        }
        chunk = [node];
        break;

      case "NotPartOfChunk":
        if (chunk.length > 0) {
          chunks.push(chunk);
          chunk = [];
        }
        break;

      default:
        throw new Error(`Unknown chunk result: ${result}`);
    }

    lastNode = node;
  }

  if (chunk.length > 0) {
    chunks.push(chunk);
  }

  return chunks;
}

function replace(context, sorted, start, end) {
  const sourceCode = context.getSourceCode();
  const original = sourceCode.getText().slice(start, end);

  if (original !== sorted) {
    context.report({
      messageId: "sort",
      loc: {
        start: sourceCode.getLocFromIndex(start),
        end: sourceCode.getLocFromIndex(end),
      },
      fix: (fixer) => fixer.replaceTextRange([start, end], sorted),
    });
  }
}

function stringifySortedItems(sortedItems, originalItems, sourceCode) {
  const newline = guessNewline(sourceCode);

  const sorted = sortedItems
    .map((groups) =>
      groups
        .map((groupItems) => groupItems.map((item) => item.code).join(newline))
        .join(newline)
    )
    .join(newline + newline);

  // Edge case: If the last export (after sorting) ends with a line
  // comment and there’s code (or a multiline block comment) on the same line,
  // add a newline so we don’t accidentally comment stuff out.
  /**
   * eg).
   * `
   * export { b } from './b' // comment
   * export { a } from './a';  const c = 1
   * `
   * if sorted it can be like below case.
   *
   * export { a } from './a';
   * export { b } from './b' // comment  const c = 1
   *
   * so new line need after comment.
   */
  const flattened = flatMap(sortedItems, (groups) => [].concat(...groups));
  const lastSortedItem = flattened[flattened.length - 1];
  const lastOriginalItem = originalItems[originalItems.length - 1];
  const nextToken = lastSortedItem.needsNewline
    ? sourceCode.getTokenAfter(lastOriginalItem.node, {
        includeComments: true,
        filter: (token) =>
          !isLineComment(token) &&
          !(
            isBlockComment(token) &&
            token.loc.end.line === lastOriginalItem.node.loc.end.line
          ),
      })
    : undefined;
  const maybeNewline =
    nextToken != null &&
    nextToken.loc.start.line === lastOriginalItem.node.loc.end.line
      ? newline
      : "";

  return sorted + maybeNewline;
}

function getExportItems(passedChunk, sourceCode, isSideEffectImport) {
  const chunk = handleLastSemicolon(passedChunk, sourceCode);

  return chunk.map((node, nodeIndex) => {
    const lastLine =
      nodeIndex === 0
        ? node.loc.start.line - 1
        : chunk[nodeIndex - 1].loc.end.line;

    // Get all comments before the import/export, except:
    //
    // - Comments on another line for the first import/export.
    // - Comments that belong to the previous import/export (if any) – that is,
    //   comments that are on the same line as the previous import/export. But
    //   multiline block comments always belong to this import/export, not the
    //   previous.
    const commentsBefore = sourceCode
      .getCommentsBefore(node)
      .filter((comment) => {
        return (
          comment.loc.start.line <= node.loc.start.line &&
          comment.loc.end.line > lastLine &&
          (nodeIndex > 0 || comment.loc.start.line > lastLine)
        );
      });

    // Get all comments after the import/export that are on the same line.
    // Multiline block comments belong to the _next_ import/export (or the
    // following code in case of the last import/export).
    const commentsAfter = sourceCode
      .getCommentsAfter(node)
      .filter((comment) => comment.loc.end.line === node.loc.end.line);

    const before = printCommentsBefore(node, commentsBefore, sourceCode);
    const after = printCommentsAfter(node, commentsAfter, sourceCode);

    // Print the indentation before the import/export or its first comment, if
    // any, to support indentation in `<script>` tags.
    const indentation = getIndentation(
      commentsBefore.length > 0 ? commentsBefore[0] : node,
      sourceCode
    );

    // Print spaces after the import/export or its last comment, if any, to
    // avoid producing a sort error just because you accidentally added a few
    // trailing spaces among the imports/exports.
    const trailingSpaces = getTrailingSpaces(
      commentsAfter.length > 0 ? commentsAfter[commentsAfter.length - 1] : node,
      sourceCode
    );

    const code =
      indentation +
      before +
      printTokens(getAllTokens(node, sourceCode)) +
      after +
      trailingSpaces;

    const all = [...commentsBefore, node, ...commentsAfter];
    const [start] = all[0].range;
    const [, end] = all[all.length - 1].range;

    const source = getSource(node);

    return {
      node,
      code,
      start: start - indentation.length,
      end: end + trailingSpaces.length,
      isSideEffectImport: isSideEffectImport(node, sourceCode),
      source,
      index: nodeIndex,
      needsNewline:
        commentsAfter.length > 0 &&
        isLineComment(commentsAfter[commentsAfter.length - 1]),
    };
  });
}

// -------------------------------NOT EXPORTED LINE-------------------------------

// Parsers think that a semicolon after a statement belongs to that statement.
// But in a semicolon-free code style it might belong to the next statement:
//
//     import x from "x"
//     ;[].forEach()
//
// If the last import/export of a chunk ends with a semicolon, and that
// semicolon isn’t located on the same line as the `from` string, adjust the
// node to end at the `from` string instead.
//
// In the above example, the import is adjusted to end after `"x"`.
function handleLastSemicolon(chunk, sourceCode) {
  const lastIndex = chunk.length - 1;
  const lastNode = chunk[lastIndex];
  const [nextToLastToken, lastToken] = sourceCode.getLastTokens(lastNode, {
    count: 2,
  });
  const lastIsSemicolon = isPunctuator(lastToken, ";");

  if (!lastIsSemicolon) {
    return chunk;
  }

  const semicolonBelongsToNode =
    nextToLastToken.loc.end.line === lastToken.loc.start.line ||
    // If there’s no more code after the last import/export the semicolon has to
    // belong to the import/export, even if it is not on the same line.
    sourceCode.getTokenAfter(lastToken) == null;

  if (semicolonBelongsToNode) {
    return chunk;
  }

  // Preserve the start position, but use the end position of the `from` string.
  const newLastNode = {
    ...lastNode,
    range: [lastNode.range[0], nextToLastToken.range[1]],
    loc: {
      start: lastNode.loc.start,
      end: nextToLastToken.loc.end,
    },
  };

  return chunk.slice(0, lastIndex).concat(newLastNode);
}

const NEWLINE = /(\r?\n)/;

function guessNewline(sourceCode) {
  const match = NEWLINE.exec(sourceCode.text);
  return match == null ? "\n" : match[0];
}

function parseWhitespace(whitespace) {
  const allItems = whitespace.split(NEWLINE);

  // Remove blank lines. `allItems` contains alternating `spaces` (which can be
  // the empty string) and `newline` (which is either "\r\n" or "\n"). So in
  // practice `allItems` grows like this as there are more newlines in
  // `whitespace`:
  //
  //     [spaces]
  //     [spaces, newline, spaces]
  //     [spaces, newline, spaces, newline, spaces]
  //     [spaces, newline, spaces, newline, spaces, newline, spaces]
  //
  // If there are 5 or more items we have at least one blank line. If so, keep
  // the first `spaces`, the first `newline` and the last `spaces`.
  const items =
    allItems.length >= 5
      ? allItems.slice(0, 2).concat(allItems.slice(-1))
      : allItems;

  return (
    items
      .map((spacesOrNewline, index) =>
        index % 2 === 0
          ? { type: "Spaces", code: spacesOrNewline }
          : { type: "Newline", code: spacesOrNewline }
      )
      // Remove empty spaces since it makes debugging easier.
      .filter((token) => token.code !== "")
  );
}

function removeBlankLines(whitespace) {
  return printTokens(parseWhitespace(whitespace));
}

// Returns `sourceCode.getTokens(node)` plus whitespace and comments. All tokens
// have a `code` property with `sourceCode.getText(token)`.
function getAllTokens(node, sourceCode) {
  const tokens = sourceCode.getTokens(node);
  const lastTokenIndex = tokens.length - 1;
  return flatMap(tokens, (token, tokenIndex) => {
    const newToken = { ...token, code: sourceCode.getText(token) };

    if (tokenIndex === lastTokenIndex) {
      return [newToken];
    }

    const comments = sourceCode.getCommentsAfter(token);
    const last = comments.length > 0 ? comments[comments.length - 1] : token;
    const nextToken = tokens[tokenIndex + 1];

    return [
      newToken,
      ...flatMap(comments, (comment, commentIndex) => {
        const previous =
          commentIndex === 0 ? token : comments[commentIndex - 1];
        return [
          ...parseWhitespace(
            sourceCode.text.slice(previous.range[1], comment.range[0])
          ),
          { ...comment, code: sourceCode.getText(comment) },
        ];
      }),
      ...parseWhitespace(
        sourceCode.text.slice(last.range[1], nextToken.range[0])
      ),
    ];
  });
}

// Prints tokens that are enhanced with a `code` property – like those returned
// by `getAllTokens` and `parseWhitespace`.
function printTokens(tokens) {
  return tokens.map((token) => token.code).join("");
}

// `comments` is a list of comments that occur before `node`. Print those and
// the whitespace between themselves and between `node`.
function printCommentsBefore(node, comments, sourceCode) {
  const lastIndex = comments.length - 1;

  return comments
    .map((comment, index) => {
      const next = index === lastIndex ? node : comments[index + 1];
      return (
        sourceCode.getText(comment) +
        removeBlankLines(sourceCode.text.slice(comment.range[1], next.range[0]))
      );
    })
    .join("");
}

// `comments` is a list of comments that occur after `node`. Print those and
// the whitespace between themselves and between `node`.
function printCommentsAfter(node, comments, sourceCode) {
  return comments
    .map((comment, index) => {
      const previous = index === 0 ? node : comments[index - 1];
      return (
        removeBlankLines(
          sourceCode.text.slice(previous.range[1], comment.range[0])
        ) + sourceCode.getText(comment)
      );
    })
    .join("");
}

function getIndentation(node, sourceCode) {
  const tokenBefore = sourceCode.getTokenBefore(node, {
    includeComments: true,
  });
  if (tokenBefore == null) {
    const text = sourceCode.text.slice(0, node.range[0]);
    const lines = text.split(NEWLINE);
    return lines[lines.length - 1];
  }
  const text = sourceCode.text.slice(tokenBefore.range[1], node.range[0]);
  const lines = text.split(NEWLINE);
  return lines.length > 1 ? lines[lines.length - 1] : "";
}

function getTrailingSpaces(node, sourceCode) {
  const tokenAfter = sourceCode.getTokenAfter(node, {
    includeComments: true,
  });
  if (tokenAfter == null) {
    const text = sourceCode.text.slice(node.range[1]);
    const lines = text.split(NEWLINE);
    return lines[0];
  }
  const text = sourceCode.text.slice(node.range[1], tokenAfter.range[0]);
  const lines = text.split(NEWLINE);
  return lines[0];
}

const sortBasedOnOrder = (itemA, itemB, order) => {
  const [first, second] = order;

  const orderMap = {
    type: compare(itemA.source.kind, itemB.source.kind),
    all: compare(itemA.node.type, itemB.node.type),
    name: -compare(
      itemA.source.isNameAndNotType,
      itemB.source.isNameAndNotType
    ),
  };

  return orderMap[first] || orderMap[second];
};

const checkValidOrder = (order) => {
  if (!Array.isArray(order) || order.length !== 3) {
    return DEFAULT_ORDER;
  }

  for (let i = 0; i < order.length; i++) {
    if (!DEFAULT_ORDER.includes(order[i]) || order.indexOf(order[i]) !== i) {
      return DEFAULT_ORDER;
    }
  }

  return order;
};

function sortExportItems(items, order) {
  return items
    .slice()
    .map((item) => {
      if (
        item.node.type === "ExportNamedDeclaration" &&
        item.source.kind === "value"
      ) {
        item.source.isNameAndNotType = 1;
      } else {
        item.source.isNameAndNotType = 0;
      }

      return item;
    })
    .sort((itemA, itemB) => {
      // If both items are side effect imports, keep their original order.
      return itemA.isSideEffectImport && itemB.isSideEffectImport
        ? itemA.index - itemB.index
        : // If one of the items is a side effect import, move it first.
        itemA.isSideEffectImport
        ? -1
        : itemB.isSideEffectImport
        ? 1
        : sortBasedOnOrder(itemA, itemB, order) ||
          // Compare the `from` part.

          // The `.source` has been slightly tweaked. To stay fully deterministic,
          // also sort on the original value.
          compare(itemA.source.originalSource, itemB.source.originalSource) ||
          // itemA.||
          // Keep the original order if the sources are the same. It’s not worth
          // trying to compare anything else, and you can use `import/no-duplicates`
          // to get rid of the problem anyway.
          itemA.index - itemB.index;
    });
}

const collator = new Intl.Collator("en", {
  sensitivity: "base",
  numeric: true,
});

function compare(a, b) {
  return collator.compare(a, b) || (a < b ? -1 : a > b ? 1 : 0);
}

function isPunctuator(node, value) {
  return node.type === "Punctuator" && node.value === value;
}

function isBlockComment(node) {
  return node.type === "Block";
}

function isLineComment(node) {
  return node.type === "Line";
}

function getSource(node) {
  const source = node.source.value;

  return {
    // Sort by directory level rather than by string length.
    source: source
      // Treat `.` as `./`, `..` as `../`, `../..` as `../../` etc.
      .replace(/^[./]*\.$/, "$&/")
      // Make `../` sort after `../../` but before `../a` etc.
      // Why a comma? See the next comment.
      .replace(/^[./]*\/$/, "$&,")
      // Make `.` and `/` sort before any other punctation.
      // The default order is: _ - , x x x . x x x / x x x
      // We’re changing it to: . / , x x x _ x x x - x x x
      .replace(/[./_-]/g, (char) => {
        switch (char) {
          case ".":
            return "_";
          case "/":
            return "-";
          case "_":
            return ".";
          case "-":
            return "/";
          // istanbul ignore next
          default:
            throw new Error(`Unknown source substitution character: ${char}`);
        }
      }),
    originalSource: source,
    kind: getImportExportKind(node),
  };
}

function getImportExportKind(node) {
  // `type` and `typeof` imports, as well as `type` exports (there are no
  // `typeof` exports). In Flow, import specifiers can also have a kind. Default
  // to "value" (like TypeScript) to make regular imports/exports come after the
  // type imports/exports.
  return node.importKind || node.exportKind || "value";
}

// Like `Array.prototype.flatMap`, had it been available.
function flatMap(array, fn) {
  return [].concat(...array.map(fn));
}

module.exports = {
  DEFAULT_ORDER,
  spliceItems,
  extractChunks,
  checkValidOrder,
  getExportItems,
  replace,
  stringifySortedItems,
  sortExportItems,
};
