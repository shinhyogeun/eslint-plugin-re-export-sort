"use strict";

const fs = require("fs");
const path = require("path");

const DIR = __dirname;
const SRC = "src";
const BUILD = path.join(DIR, "build");

const FILES_TO_COPY = [
  { src: "LICENSE" },
  { src: "package.json" },
  { src: "README.md" },
  ...fs
    .readdirSync(SRC)
    .map((file) => ({ src: path.join(SRC, file), dest: file })),
];

fs.rmSync(BUILD, { recursive: true, force: true });
fs.mkdirSync(BUILD);

for (const { src, dest = src, transform } of FILES_TO_COPY) {
  if (transform) {
    fs.writeFileSync(
      path.join(BUILD, dest),
      transform(fs.readFileSync(path.join(DIR, src), "utf8"))
    );
  } else {
    fs.copyFileSync(path.join(DIR, src), path.join(BUILD, dest));
  }
}
