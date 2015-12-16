/*
Convert `module.exports` to ES2015 `export default`.

Example:

```coffeescript
module.exports = function() {};
```

```javascript
export default function() {};
```

Assumptions:
- I think that this means that you need to use `import` instead of `require`, but
  I'm not sure.
*/

module.exports = (file, api) => {
  const j = api.jscodeshift;
  const root = j(file.source);

  const moduleExportsChanged = root
    .find(j.ExpressionStatement, {
      expression: {
        type: "AssignmentExpression",
        left: {
          type: "MemberExpression",
          object: { name: "module" },
          property: { name: "exports" },
        },
      },
    })
    .replaceWith(p => j.exportDeclaration(true, p.node.expression.right))
    .size() > 0;

  if (moduleExportsChanged) {
    return root.toSource();
  }

  return null;
};
