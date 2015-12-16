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

const transformExpressionsIntoTemplates = (root, j) =>
  root
    .find(j.BinaryExpression, { operator: "+" })
    .filter(exp => {
      const left = exp.value.left;
      const right = exp.value.right;

      const stringRight = right.type === "Literal" && typeof right.value === "string";
      const stringLeft = left.type === "Literal" && typeof left.value === "string";
      const binaryExpressionLeft = left.type === "BinaryExpression";

      const involvesStrings = stringLeft || stringRight && !binaryExpressionLeft;
      const involvesTemplates = exp.value.left.type === "TemplateLiteral" ||
        exp.value.right.type === "TemplateLiteral";

      return involvesStrings || involvesTemplates;
    })
    .replaceWith(exp => {
      const quasisFromLiteral = literal =>
        j.templateElement({ cooked: literal.value, raw: literal.rawValue }, false);
      const left = exp.value.left;
      const right = exp.value.right;
      const stringRight = right.type === "Literal" && typeof right.value === "string";
      const stringLeft = left.type === "Literal" && typeof left.value === "string";

      const quasis = [];
      const expressions = [];

      if (stringLeft) {
        quasis.push(quasisFromLiteral(left));
      } else if (left.type === "TemplateLiteral") {
        quasis.push(...left.quasis);
        expressions.push(...left.expressions);
      } else {
        quasis.push(j.templateElement({ cooked: "", raw: "" }, false));
        expressions.push(left);
      }

      if (stringRight) {
        quasis.push(quasisFromLiteral(right));
      } else if (right.type === "TemplateLiteral") {
        quasis.push(...right.quasis);
        expressions.push(...right.expressions);
      } else {
        if (quasis.length === 0) {
          quasis.push(j.templateElement({ cooked: "", raw: "" }, false));
        }

        expressions.push(right);
        quasis.push(j.templateElement({ cooked: "", raw: "" }, false));
      }

      return j.templateLiteral(quasis, expressions);
    })
    .size() > 0;

module.exports = (file, api) => {
  const j = api.jscodeshift;
  const root = j(file.source);
  let expressionsChanged = true;
  let runCounter = 0;

  while (expressionsChanged) {
    runCounter++;
    if (!transformExpressionsIntoTemplates(root, j)) {
      expressionsChanged = false;
    }
  }

  if (runCounter > 1) {
    return root
      .toSource();
  }

  return null;
};
