/*
Convert CoffeeScript for..in loops (with index) into ES2015 forEach loops

Example:

```coffeescript
for item, index in list
  console.info(item, index)
```

```javascript
list.forEach((item, index) => {
  return console.info(item, index);
});
```
*/

import removeVariableDeclarator from "./util/remove-variable-declarator";

module.exports = (file, api) => {
  const j = api.jscodeshift;
  const root = j(file.source);

  const forStatementsWithIndexChanged = root
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
              type: "AssignmentExpression",
              operator: "=",
              left: {
                type: "Identifier",
              },
              right: {
                type: "Literal",
                value: 0,
              },
            },
          },
          {
            type: "AssignmentExpression",
            operator: "=",
            left: {
              type: "Identifier",
              name: "len",
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
        type: "AssignmentExpression",
        operator: "=",
        right: {
          type: "UpdateExpression",
          prefix: true,
          operator: "++",
        },
      },
    })
    .replaceWith(exp => {
      const newBody = exp.value.body;
      const oldKeyExpression = newBody.body.shift().expression;
      const indexIdentifier = oldKeyExpression.right.property;
      const keyIdentifier = oldKeyExpression.left;

      // internal variable that keeps track of the index
      removeVariableDeclarator(exp.value.init.expressions[0].right.left.name, exp.scope.path, api);
      // internal variable that keeps track of the length of the array that's being looped
      removeVariableDeclarator(exp.value.init.expressions[1].left.name, exp.scope.path, api);
      // Will be overwritten by the forEach callback
      removeVariableDeclarator(keyIdentifier.name, exp.scope.path, api);
      removeVariableDeclarator(indexIdentifier.name, exp.scope.path, api);

      return j.expressionStatement(
        j.callExpression(
          j.memberExpression(
            oldKeyExpression.right.object,
            j.identifier("forEach")
          ),
          [
            j.arrowFunctionExpression(
              [
                keyIdentifier,
                indexIdentifier,
              ],
              newBody
            ),
          ]
        )
      );
    });

  if (forStatementsWithIndexChanged) {
    return root.toSource();
  }

  return null;
};
