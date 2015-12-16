/*
Convert CoffeeScript's indexOf variable into a plain old indexOf call.

Example:

```coffeescript
a in b
```

```javascript
b.indexOf(a) >= 0;
```
*/

import removeVariableDeclarator from "./util/remove-variable-declarator";

module.exports = function(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);

  const indexOfExpressionsChanged = root
    .find(j.CallExpression, {
      callee: {
        type: "MemberExpression",
        object: {
          type: "Identifier",
          name: "indexOf",
        },
        property: {
          type: "Identifier",
          name: "call",
        },
      },
    })
    .replaceWith(exp =>
      j.callExpression(
        j.memberExpression(
          exp.value.arguments[0],
          j.identifier("indexOf")
        ),
        [
          exp.value.arguments[1],
        ]
      )
    )
    .size() > 0;

  if (indexOfExpressionsChanged) {
    removeVariableDeclarator("indexOf", root.paths(), api);

    return root.toSource();
  }

  return null;
};
