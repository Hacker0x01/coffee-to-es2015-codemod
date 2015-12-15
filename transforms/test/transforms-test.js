jest.autoMockOff();

import fs from "fs";
import path from "path";
const jscodeshift = require("jscodeshift");

const test = (coffeeOutputFilename, transform) => {
  const testName = path.basename(coffeeOutputFilename, ".coffee-output");

  it(testName, () => {
    const expectedPath = coffeeOutputFilename.replace(".coffee-output", ".expected");
    const coffeeOut = fs.readFileSync(coffeeOutputFilename, "utf8");
    const expected = fs.readFileSync(expectedPath, "utf8");

    const output = transform({
      path: coffeeOutputFilename,
      source: coffeeOut,
    }, { jscodeshift }, {});

    expect(output.trim()).toEqual(expected.trim());
  });
};

const findAndRunTestsForDirectory = directory => {
  const filePaths = fs.readdirSync(directory);

  const coffeeFiles = filePaths
    .map(file => path.join(__dirname, path.basename(directory), file))
    .filter(file =>
      /\.coffee-output$/.test(file)
    );

  describe(`#${path.basename(directory)}`, () => {
    const transformPath = path.join(directory, "..", "..", path.basename(directory));
    const transform = require(path.resolve(transformPath)).default;
    coffeeFiles.forEach(coffeeFile => test(coffeeFile, transform));
  });
};

const allFiles = fs.readdirSync(`${__dirname}/`);

const directories = allFiles
  // Turn paths absolute
  .map(file => path.join(__dirname, file))
  // Filter out directories
  .filter(file => fs.statSync(file).isDirectory());

directories.forEach(findAndRunTestsForDirectory);
