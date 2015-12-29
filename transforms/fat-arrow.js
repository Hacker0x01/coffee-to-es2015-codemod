/*
Convert CoffeeScript fat arrows to ES2015 fat arrows.

Example:

```coffeescript
handleChange = (event) =>
  event.preventDefault()
```

```javascript
handleChange = (event) => {
  return event.preventDefault();
};
```

Assumptions:
- Every time that you have a CallExpression that has a FunctionExpression as a
  callee and `this` as only argument, we assume that this is in fact a
  CoffeeScript fat arrow method.
*/

module.exports = (file, api) => {
  const j = api.jscodeshift;
  const root = j(file.source);

  const transformSimpleFatArrows = () =>
    root
      .find(j.CallExpression, {
        callee: {
          type: "FunctionExpression",
        },
        arguments: [
          { type: "ThisExpression" },
        ],
      })
      .forEach(exp => {
        const realMethod = exp.node.callee.body.body[0].argument;

        exp.replace(
          j.arrowFunctionExpression(realMethod.params, realMethod.body)
        );
      })
      .size() > 0;

  const getClosestMethodExpression = path => {
    let currentPath = path;

    while (
      currentPath &&
      !(
        j.FunctionExpression.check(currentPath.value) ||
        j.ArrowFunctionExpression.check(currentPath.value)
      )
    ) {
      currentPath = currentPath.parent;
    }

    return currentPath;
  };

  const transformIntoArrowFunction = exp =>
    j.arrowFunctionExpression(exp.value.params, exp.value.body);

  const transformNestedFatArrows = () =>
    root
      .find(j.FunctionExpression)
      .filter(exp =>
        j(exp)
          .find(j.Identifier, { name: "_this" })
          .filter(identifier => identifier.scope.path === exp)
          .size() > 0
      )
      .forEach(exp => {
        let method = exp;

        while (method && method.value.type === "FunctionExpression") {
          j(method).replaceWith(transformIntoArrowFunction);
          method = getClosestMethodExpression(method.parent);
        }
      });

  const argumentsUsedInArrowMethods = () =>
    root
      .find(j.ArrowFunctionExpression)
      .filter(exp =>
        j(exp)
          .find(j.Identifier, { name: "arguments" })
          .filter(identifier => identifier.scope.path === exp)
          .size() > 0
      )
      .size() > 0;

  const replaceOldThis = () =>
    root
      .find(j.Identifier, { name: "_this" })
      .replaceWith(j.identifier("this"));

  if (transformSimpleFatArrows()) {
    transformNestedFatArrows();
    replaceOldThis();

    if (argumentsUsedInArrowMethods()) {
      throw new Error("arguments does not work the same way in ES2015 arrow" +
        "methods as it does in CoffeeScript arrow methods. Skipping transformation." +
        "For more information, please refer to:" +
        "https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Functions/Arrow_functions#Lexical_arguments`");
    }

    return root.toSource();
  }

  return null;
};
