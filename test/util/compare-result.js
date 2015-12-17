const { expect } = require("chai");
const jscodeshift = require("jscodeshift");
const { compile } = require("coffee-script");

module.exports = (testName, transform, source) => {
  it(testName, () => {
    const ES5Source = compile(source, { bare: true });
    const transformedSource = transform({ ES5Source }, { jscodeshift });

    // We expect the transform to change the output
    expect(transformedSource).not.to.be.null;

    /* eslint-disable no-eval */
    expect(eval(source)).to.deep.eq(eval(transformedSource));
    /* eslint-enable no-eval */
  });
};

