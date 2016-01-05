/*
Remove empty variable declarations created by CoffeeScript

Example:

```coffeescript
a = 1

# Translates to:
# var a;
# a = 1;
```

```javascript
var a = 1;
```

This transform finds all assignments and replaces them with variable declarators.

FIXME:
- I don't think that this properly covers all cases. We should write more tests
*/

module.exports = function(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);
  const getAssignmentCollection = declaratorPath =>
    j(declaratorPath.scope.path)
      .find(j.ExpressionStatement, {
        expression: {
          type: "AssignmentExpression",
          operator: "=",
          left: {
            type: "Identifier",
            name: declaratorPath.value.id.name,
          },
        },
      })
      .filter(exp => declaratorPath.scope === exp.scope);

  const declaratorsChanged = root
    .find(j.VariableDeclarator, {
      init: null,
    })
    .filter(
      declaratorPath => getAssignmentCollection(declaratorPath).size() > 0
    )
    .forEach(declaratorPath => {
      getAssignmentCollection(declaratorPath)
        .replaceWith(assignmentPath =>
          j.variableDeclaration(
            "var",
            [
              j.variableDeclarator(
                declaratorPath.value.id,
                assignmentPath.value.expression.right
              ),
            ]
          )
        );

      const declarationPath = declaratorPath.parent;
      const declarations = declarationPath.value.declarations;
      const indexOfDeclaration = declarations.indexOf(declaratorPath.value);

      declarations.splice(indexOfDeclaration, 1);

      if (declarations.length === 0) {
        j(declarationPath).remove();
      }
    })
    .size() > 0;

  if (declaratorsChanged) {
    return root.toSource();
  }

  return null;
};
