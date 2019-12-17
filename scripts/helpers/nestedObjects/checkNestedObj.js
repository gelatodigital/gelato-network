export default (obj, property, ...rest) => {
  if (obj === undefined) return false;
  if (rest.length == 0 && obj.hasOwnProperty(property)) return true;
  return checkNestedObj(obj[property], ...rest);
};
