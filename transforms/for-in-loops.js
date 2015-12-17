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

Assumptions:
- All for-loops that have an update and where the first expression in the body
  is an UpdateExpression are considered CoffeeScript for..in loops and therefor converted
- If the update of a for loop is an assignment, we assume that we need to keep track
  of index, and therfor need to run `.forEach`

FIXME:
- This transform is pretty big on the assumptions, we should try and lock it down
  more.
- This transform doesn't clean up after itself, it oftentimes leaves `ref`, `len`
  variable declarations in the body.
*/

module.exports = (file, api) => {
  const j = api.jscodeshift;
  const root = j(file.source);

  const forStatementsChanged = root
    .find(j.ForStatement, {
      update: {
        type: "UpdateExpression",
      },
    })
    .filter(exp => exp.value.body.body[0].type === "ExpressionStatement")
    .replaceWith(exp => {
      const oldBody = exp.value.body;
      const key = oldBody.body[0].expression.left.name;
      const left = j.variableDeclaration("let", [j.identifier(key)]);
      const newBody = exp.value.body;
      const oldKeyExpression = newBody.body.shift().expression;
      const right = oldKeyExpression.right.object;

      return j.forOfStatement(left, right, exp.value.body);
    })
    .size() > 0;

  if (forStatementsChanged) {
    return root.toSource();
  }

  return null;
};
