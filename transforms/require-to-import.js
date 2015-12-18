/*
Convert require statements to ES2015 import statements

Example:

```coffeescript
React = require("react/addons");
```

```javascript
var React;

import React from "react/addons";
```
*/

import findParentOfType from "./util/find-parent-of-type";
import removeVariableDeclarator from "./util/remove-variable-declarator";

module.exports = (file, api) => {
  const j = api.jscodeshift;
  const root = j(file.source);

  const requiresChanged = root
    .find(j.CallExpression, {
      callee: {
        type: "Identifier",
        name: "require",
      },
    })
    .forEach(exp => {
      const parentExpStat = findParentOfType(exp, "ExpressionStatement");

      // Remove the CoffeeScript-hoisted variable declarator
      removeVariableDeclarator(parentExpStat.node.expression.left.name, exp.scope.path, api);

      if (exp.parent.node.type === "CallExpression") {
        const parentCall = exp.parent;
        const importIdent = j.identifier(`${parentExpStat.node.expression.left.name}Import`);
        const origIdent = parentExpStat.node.expression.left;

        parentExpStat.replace(
          j.importDeclaration(
            [
              j.importDefaultSpecifier(importIdent),
            ],
            exp.node.arguments[0]
          )
        );

        parentExpStat.insertAfter(
          j.variableDeclaration(
            "const",
            [
              j.variableDeclarator(
                origIdent,
                j.callExpression(
                  importIdent, parentCall.node.arguments
                )
              ),
            ]
          )
        );
      } else {
        let specifiers = [];

        if (parentExpStat.node.expression.left) {
          specifiers = [
            j.importDefaultSpecifier(parentExpStat.node.expression.left),
          ];
        }

        parentExpStat.replace(
          j.importDeclaration(specifiers, exp.node.arguments[0])
        );
      }
    })
    .size() > 0;

  if (requiresChanged) {
    return root.toSource();
  }

  return null;
};
