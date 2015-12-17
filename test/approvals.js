const { expect } = require("chai");
const fs = require("fs");
const path = require("path");
const jscodeshift = require("jscodeshift");

const approvalsDirectory = path.join(__dirname, "approvals");

const test = (coffeeOutputFilename, transform) => {
  const testName = path.basename(coffeeOutputFilename, ".coffee-output");

  it(testName, () => {
    const expectedPath = coffeeOutputFilename.replace(".coffee-output", ".expected");
    const coffeeOut = fs.readFileSync(coffeeOutputFilename).toString();
    const expected = fs.readFileSync(expectedPath).toString();
    const fileName = path.basename(coffeeOutputFilename);

    const output = transform({
      path: fileName,
      source: coffeeOut,
    }, { jscodeshift }, {});

    expect(output.trim()).to.equal(expected.trim());
  });
};

const findAndRunTestsForDirectory = directory => {
  const filePaths = fs.readdirSync(directory);

  const coffeeFiles = filePaths
    .map(file => path.join(approvalsDirectory, path.basename(directory), file))
    .filter(file =>
      /\.coffee-output$/.test(file)
    );

  describe(`#${path.basename(directory)}`, () => {
    const transformPath = path.join(directory, "..", "..", "..", "transforms", path.basename(directory));
    const transform = require(transformPath);
    coffeeFiles.forEach(coffeeFile => test(coffeeFile, transform));
  });
};

const allFiles = fs.readdirSync(approvalsDirectory);

const directories = allFiles
  // Turn paths absolute
  .map(file => path.join(approvalsDirectory, file))
  // Filter out directories
  .filter(file => fs.statSync(file).isDirectory());

directories.forEach(findAndRunTestsForDirectory);
