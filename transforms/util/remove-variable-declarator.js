export default (variableName, path, api) => {
  const j = api.jscodeshift;

  j(path)
    .find(j.VariableDeclarator, {
      id: {
        type: "Identifier",
        name: variableName,
      },
    })
    .forEach(extendDeclaration => {
      const declarations = extendDeclaration.parent.value.declarations;
      const indexOfDeclarator = declarations.indexOf(extendDeclaration.value);

      declarations.splice(indexOfDeclarator, 1);

      if (declarations.length === 0) {
        j(extendDeclaration.parent).remove();
      }
    });
};
