/*
Convert string concatenation to template literals

Example:

```coffeescript
"foo#{bar}"
```

```javascript
`foo${bar}`
```
*/

module.exports = (file, api) => {
  const j = api.jscodeshift;
  const root = j(file.source);

  const appendNodeToTemplate = (node, template) => {
    var quasis = template.quasis;
    var expressions = template.expressions;
    var lastQuasisValue = quasis[quasis.length - 1].value;

    switch (node.type) {
    case "TemplateLiteral":
      var [firstRightQuasis, ...restRightQuasis] = node.quasis;
      quasis[quasis.length - 1] = j.templateElement({
        cooked: lastQuasisValue.cooked + firstRightQuasis.value.cooked,
        raw: lastQuasisValue.raw + firstRightQuasis.value.raw,
      }, firstRightQuasis.tail);
      quasis.push(...restRightQuasis);
      expressions.push(...node.expressions);
      break;
    case "Literal":
      quasis[quasis.length - 1] = j.templateElement({
        cooked: lastQuasisValue.cooked + node.value,
        raw: lastQuasisValue.raw + node.rawValue,
      }, true);
      break;
    default:
      quasis[quasis.length - 1].tail = false;
      expressions.push(node);
      quasis.push(j.templateElement({
        cooked: "",
        raw: "",
      }, true));
      break;
    }
  };

  const transformBinaryExpressions = () =>
    root
      .find(j.BinaryExpression, { operator: "+" })
      .filter(exp => {
        const left = exp.value.left;
        const right = exp.value.right;
        const leftType = left.type;
        const rightType = right.type;

        // We'll convert these nested expressions inside out, not outside in
        if (leftType === "BinaryExpression" || rightType === "BinaryExpression") {
          return false;
        }

        const leftIsString = leftType === "Literal" && typeof left.value === "string";
        const rightIsString = rightType === "Literal" && typeof right.value === "string";
        const leftIsTemplate = leftType === "TemplateLiteral";
        const rightIsTemplate = rightType === "TemplateLiteral";

        return leftIsString || rightIsString || leftIsTemplate || rightIsTemplate;
      })
      .replaceWith(exp => {
        const template = j.templateLiteral(
          [j.templateElement({ cooked: "", raw: "" }, true)],
          []
        );

        appendNodeToTemplate(exp.value.left, template);
        appendNodeToTemplate(exp.value.right, template);

        return template;
      })
      .size() > 0;

  let expressionsChanged = true;
  let runCounter = 0;

  while (expressionsChanged) {
    runCounter++;
    if (!transformBinaryExpressions()) {
      expressionsChanged = false;
    }
  }

  if (runCounter > 1) {
    return root
      .toSource();
  }

  return null;
};
