/*
Convert CoffeeScript for..in loops into ES2015 for..of loops

Example:

```coffeescript
for a in b
  console.info(a)
```

```javascript
for (a of b) {
  return console.info(a);
}
```
*/

import removeVariableDeclarator from "./util/remove-variable-declarator";

module.exports = (file, api) => {
  const j = api.jscodeshift;
  const root = j(file.source);

  const forStatementsChanged = root
    .find(j.ForStatement, {
      init: {
        type: "SequenceExpression",
        expressions: [
          {
            type: "AssignmentExpression",
            operator: "=",
            left: {
              type: "Identifier",
            },
            right: {
              type: "Literal",
              value: 0,
            },
          }, {
            type: "AssignmentExpression",
            operator: "=",
            left: {
              type: "Identifier",
            },
            right: {
              type: "MemberExpression",
              property: {
                type: "Identifier",
                name: "length",
              },
            },
          },
        ],
      },
      test: {
        type: "BinaryExpression",
        operator: "<",
        left: {
          type: "Identifier",
        },
        right: {
          type: "Identifier",
        },
      },
      update: {
        type: "UpdateExpression",
        prefix: false,
        operator: "++",
      },
    })
    .filter(exp => {
      const firstBodyLine = exp.value.body.body[0];
      const initExpressions = exp.value.init.expressions;

      return firstBodyLine.type === "ExpressionStatement" &&
        // Match the `i` in `b[i]` with `i = 0`
        firstBodyLine.expression.right.property.name === initExpressions[0].left.name &&
        // Match the `b` in `b[i]` with `b.length`
        firstBodyLine.expression.right.object.name === initExpressions[1].right.object.name;
    })
    .replaceWith(exp => {
      const oldBody = exp.value.body;
      const oldKeyExpression = oldBody.body.shift().expression;
      const valueVariableName = oldKeyExpression.left.name;
      const right = oldKeyExpression.right.object;
      const left = j.variableDeclaration("let", [j.identifier(valueVariableName)]);

      // Will be overwritten by `let`
      removeVariableDeclarator(valueVariableName, exp.scope.path, api);
      // internal variable that keeps track of the index
      removeVariableDeclarator(oldKeyExpression.right.property.name, exp.scope.path, api);
      // internal variable that keeps track of the length of the array that's being looped
      removeVariableDeclarator(exp.value.init.expressions[1].left.name, exp.scope.path, api);

      return j.forOfStatement(left, right, exp.value.body);
    })
    .size() > 0;

  if (forStatementsChanged) {
    return root.toSource();
  }

  return null;
};
