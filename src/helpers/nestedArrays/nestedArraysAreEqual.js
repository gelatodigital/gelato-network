function nestedArraysAreEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length != b.length) return false;

  for (var i = 0; i < a.length; ++i) {
    // console.log(
    //   `${a[i]} !== ${b[i]}  ? : ${a[i].toString() !== b[i].toString()}`
    // );
    if (Array.isArray(a[i])) return nestedArraysAreEqual(a[i], b[i]);
    if (a[i].toString() !== b[i].toString()) return false;
  }
  return true;
}

export default nestedArraysAreEqual;
