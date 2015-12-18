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

export default (file, api) => {
  const j = api.jscodeshift;
  const root = j(file.source);

  const isImmediatelyInvoked = exp => exp.parent.value.type === "CallExpression";
  const getOuterCallExpression = exp => {
    if (isImmediatelyInvoked(exp)) {
      return exp.parent;
    }

    return exp;
  };
  const isBeingAssigned = exp =>
    getOuterCallExpression(exp).parent.value.type !== "ExpressionStatement";
  const getAssignmentRoot = exp => getOuterCallExpression(exp).parent;

  const getOuterExpression = exp => {
    if (isBeingAssigned(exp)) {
      return getAssignmentRoot(exp).parent;
    }

    return getOuterCallExpression(exp).parent;
  };

  const getAssignmentSubjectName = exp => {
    const assignmentRoot = getAssignmentRoot(exp);

    if (assignmentRoot.value.type === "VariableDeclarator") {
      return assignmentRoot.value.id.name;
    } else if (assignmentRoot.value.type === "AssignmentExpression") {
      return assignmentRoot.value.left.name;
    }
  };

  const isTopLevelExpression = exp =>
    getOuterExpression(exp).parent.value.type === "Program";

  const requiresTransformed = root
    .find(j.CallExpression, {
      callee: {
        type: "Identifier",
        name: "require",
      },
    })
    .filter(isTopLevelExpression)
    .forEach(exp => {
      const outerExpression = getOuterExpression(exp);
      const specifiers = [];

      if (isBeingAssigned(exp)) {
        specifiers.push(j.importDefaultSpecifier(
          j.identifier(getAssignmentSubjectName(exp))
        ));

        if (isImmediatelyInvoked(exp)) {
          specifiers[0].local.name += "Import";
        }

        j(exp.scope.path)
          .find(j.VariableDeclarator, {
            id: {
              type: "Identifier",
              name: getAssignmentSubjectName(exp),
            },
            init: null,
          })
          .remove();
      } else if (isImmediatelyInvoked(exp)) {
        specifiers.push(j.importDefaultSpecifier(
          j.identifier("anonymousImport")
        ));
      }

      outerExpression.insertBefore(
        j.importDeclaration(
          specifiers,
          exp.value.arguments[0]
        )
      );

      if (isImmediatelyInvoked(exp)) {
        const callExp = j.callExpression(
          j.identifier(specifiers[0].local.name),
          getOuterCallExpression(exp).value.arguments
        );

        if (isBeingAssigned(exp)) {
          outerExpression.insertBefore(
            j.variableDeclaration(
              "const",
              [
                j.variableDeclarator(
                  j.identifier(getAssignmentSubjectName(exp)),
                  callExp
                ),
              ]
            )
          );
        } else {
          outerExpression.insertBefore(
            j.expressionStatement(callExp)
          );
        }
      }

      getOuterExpression(exp).replace();
    })
    .size() > 0;

  if (requiresTransformed) {
    return root.toSource();
  }

  return null;
};
