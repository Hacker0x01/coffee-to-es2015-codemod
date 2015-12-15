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

FIXME:
- This transform should be checked against the CoffeeScript source to see if the
  assumptions are correct.
*/

export default (file, api) => {
  const j = api.jscodeshift;
  const root = j(file.source);

  const fatArrowsTransformed = root
    .find(j.CallExpression, {
      callee: {
        type: "FunctionExpression",
      },
      arguments: [
        { type: "ThisExpression" },
      ],
    })
    .forEach(exp => {
      const thisValue = exp.node.callee.params[0].name;

      j(exp.node.callee.body)
        .find(j.Identifier, { name: thisValue })
        .replaceWith(j.identifier("this"));
    })
    .replaceWith(exp => {
      const realMethod = exp.node.callee.body.body[0].argument;

      return j.arrowFunctionExpression(realMethod.params, realMethod.body);
    })
    .size() > 0;

  if (fatArrowsTransformed) {
    return root.toSource();
  }

  return null;
};
