/*
Convert object methods to ES2015 object literal methods.

Example:

```coffeescript
method: (args) ->
  console.info(args)
```

```javascript
({
  method(args) {
    return console.info(args);
  }
});
```
*/

module.exports = (file, api) => {
  const j = api.jscodeshift;
  const root = j(file.source);

  const objectLiteralsChanged = root
    .find(j.Property, {
      value: {
        type: "FunctionExpression",
      },
    })
    .replaceWith(exp => {
      const prop = j.property(
        exp.node.kind,
        exp.node.key,
        j.functionExpression(
          null,
          exp.node.value.params,
          exp.node.value.body
        )
      );

      prop.method = true;
      return prop;
    })
    .size() > 0;

  if (objectLiteralsChanged) {
    return root.toSource();
  }

  return null;
};
