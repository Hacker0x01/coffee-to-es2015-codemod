import { expect } from "chai";
import transform from "../transforms/fat-arrow";
import jscodeshift from "jscodeshift";

describe("fat-arrow", () => {
  it("raises when arguments are used inside of a (new) fat arrow method", () => {
    const source = `var handleChange;

handleChange = (function(_this) {
  return function(event) {
    return console.info(arguments);
  };
})(this);`;

    expect(() =>
      transform({
        source,
      }, { jscodeshift })
    ).to.throw();
  });
});
