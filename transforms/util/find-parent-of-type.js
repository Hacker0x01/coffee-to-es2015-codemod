const findParentOfType = (path, parentType) => {
  if (path.node.type === parentType) {
    return path;
  }

  return path.parent === null ? false : findParentOfType(path.parent, parentType);
};

module.exports = findParentOfType;
