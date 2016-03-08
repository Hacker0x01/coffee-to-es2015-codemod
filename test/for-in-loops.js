const compareResult = require("./util/compare-result");
const forInLoopsTransform = require("../transforms/for-in-loops");

describe("for-in-loops", () => {
  compareResult("Iterating through a list", forInLoopsTransform, `
    ((input, output) ->
      for item in input
        output.push item
    )([1, '2', '3', 'string'], [])
  `);
});


