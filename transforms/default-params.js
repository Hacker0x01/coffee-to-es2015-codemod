/*
Convert CoffeeScript default parameters to ES2015 default parameters

Example:

```coffeescript
handleChange = (param = true) ->
  console.info(param)
```

```javascript
var handleChange;

handleChange = function(param = true) {
  return console.info(param);
};
```

Assumptions:
- Scary: every function definition that has an if statement that checks if a parameter
  is null, and has an assignment as its body, will be transformed into a default
  parameter. I'm not quite sure how scary this is, but if you have said if statement
  at the bottom of the method it'll still get picked up.

FIXME:
- See if we can tighten this more based on how the CoffeeScript compiler treats this.
  (Can we check for only the first if statements in the body?)
*/

module.exports = function(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);

  const functionsChanged = root
    .find(j.FunctionExpression)
    .filter(exp => exp.value.params.length > 0)
    .forEach(exp => {
      const body = exp.value.body.body;
      const ifStatements = body.filter(bodyItem =>
        bodyItem.type === "IfStatement"
      );
      const params = exp.value.params;

      params.forEach((param, indexOfParam) => {
        const paramIsNullIfStatement = ifStatements
          .find(ifStatement => {
            const test = ifStatement.test;
            const testLeft = test.left;
            const testRight = test.right;
            const consequent = ifStatement.consequent;

            return ifStatement.test.type === "BinaryExpression" &&
                test.operator === "==" &&
                testLeft.type === "Identifier" &&
                testLeft.name === param.name &&
                testRight.type === "Literal" &&
                testRight.value === null &&
                consequent.body.length === 1 &&
                consequent.body[0].type === "ExpressionStatement" &&
                consequent.body[0].expression.left.type === "Identifier" &&
                consequent.body[0].expression.left.name === param.name;
          });
        const indexOfparamIsNullIfStatement = body.indexOf(paramIsNullIfStatement);

        if (typeof paramIsNullIfStatement === "undefined") {
          return;
        }

        body.splice(indexOfparamIsNullIfStatement, 1);
        exp.value.params[indexOfParam] = j.assignmentPattern(
          param,
          paramIsNullIfStatement.consequent.body[0].expression.right
        );
      });
    })
    .size() > 0;

  if (functionsChanged) {
    return root.toSource();
  }

  return null;
};
