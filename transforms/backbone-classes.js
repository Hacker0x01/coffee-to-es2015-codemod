/*
Convert CoffeeScript classes that extend other classes into `superClass.extend` calls.

Example:

```coffeescript
class Todo extends Backbone.Model
```

```javascript
Todo = Backbone.Model.extend({

});
```

Assumptions:
- Every time a method receives `superClass` as an argument we assume it's body
  to be a CoffeeScript class.
- `extend`, `bind` and `hasProp` are expected to be variables that are only used
  by CoffeeScript classes (we remove them in this transform).
- Each triply nested memberExpression with `__super__` is replaced by
  `superClass.prototype.METHOD.apply()`

FIXME:
- This transform is pretty big on its assumptions. Ideally we should find a way to
  convert CoffeeScript classes into ES2015 classes, but because of the nature of
  the HackerOne codebase (all classes are Backbone Models/Collections) I decided
  to go with the easy route first.
*/

import removeVariableDeclarator from "./util/remove-variable-declarator";

module.exports = (file, api) => {
  const j = api.jscodeshift;
  const isConstructor = bodyElement =>
    bodyElement.type === "FunctionDeclaration";

  const isPrototypeMethod = bodyElement =>
    bodyElement.type === "ExpressionStatement" &&
        bodyElement.expression.left &&
        bodyElement.expression.left.type === "MemberExpression" &&
        bodyElement.expression.left.object.type === "MemberExpression" &&
        bodyElement.expression.left.object.property.name === "prototype";

  const transformConstructorBody = bodyElement => {
    j(bodyElement)
      .find(j.AssignmentExpression, {
        left: {
          type: "MemberExpression",
          object: {
            type: "ThisExpression",
          },
        },
        right: {
          type: "CallExpression",
          callee: {
            type: "Identifier",
            name: "bind",
          },
        },
      })
      .replaceWith(exp =>
        j.assignmentExpression(
          "=",
          exp.value.left,
          j.callExpression(
            j.memberExpression(
              exp.value.right.arguments[0],
              j.identifier("bind")
            ),
            exp.value.right.arguments.slice(1)
          )
        )
      );

    return bodyElement;
  };

  const transformBodyElementToProperty = bodyElement => {
    if (isConstructor(bodyElement) && bodyElement.body.body.length > 1) {
      return j.property(
        "init",
        j.identifier("constructor"),
        j.functionExpression(
          null,
          [],
          transformConstructorBody(bodyElement.body)
        )
      );
    } else if (isPrototypeMethod(bodyElement)) {
      return j.property(
        "init",
        j.identifier(bodyElement.expression.left.property.name),
        bodyElement.expression.right
      );
    }
  };

  const transformSuperCalls = (classBody, superClass) =>
    j(classBody)
      .find(j.CallExpression, {
        callee: {
          type: "MemberExpression",
          object: {
            type: "MemberExpression",
            object: {
              type: "MemberExpression",
              object: { type: "Identifier" },
              property: { type: "Identifier", name: "__super__" },
            },
            property: { type: "Identifier" },
          },
          property: { type: "Identifier", name: "apply" },
        },
      })
      .replaceWith(exp =>
        j.callExpression(
          j.memberExpression(
            j.memberExpression(
              j.memberExpression(
                superClass,
                j.identifier("prototype")
              ),
              exp.value.callee.object.property
            ),
            j.identifier("apply")
          ),
          exp.value.arguments
        )
      );

  const hasStaticProp = exp =>
    exp.value.callee.body.body.find(bodyElement =>
      bodyElement.type === "ExpressionStatement" &&
      bodyElement.expression.type === "AssignmentExpression" &&
      bodyElement.expression.left.type === "MemberExpression" &&
      bodyElement.expression.left.object.type === "Identifier"
    );

  return j(file.source)
    .find(j.CallExpression, {
      callee: {
        type: "FunctionExpression",
      },
    })
    .filter(exp =>
      exp.value.callee.params.length === 1 &&
      exp.value.callee.params[0].name === "superClass"
    )
    .filter(exp => !hasStaticProp(exp))
    .replaceWith(exp => {
      const callee = exp.value.callee;
      const superClass = exp.value.arguments[0];
      const newBody = [];

      callee.body.body.forEach(bodyElement => {
        const property = transformBodyElementToProperty(bodyElement);

        if (property) {
          if (property.value.type === "FunctionExpression") {
            property.method = true;
          }

          newBody.push(property);
        }
      });

      removeVariableDeclarator("extend", exp.scope.path, api);
      removeVariableDeclarator("hasProp", exp.scope.path, api);
      removeVariableDeclarator("bind", exp.scope.path, api);

      transformSuperCalls(newBody, superClass);

      return j.callExpression(
        j.memberExpression(superClass, j.identifier("extend")),
        [
          j.objectExpression(newBody),
        ]
      );
    })
    .toSource();
};
