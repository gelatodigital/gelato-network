class GelatoProvider {
  constructor({ addr, module: _module }) {
    if (typeof addr !== "string")
      throw new Error("\nProvider: no string addr passed to constructor \n");
    if (!module)
      throw new Error("\nProvider: no module passed to constructor\n");
    this.addr = addr;
    this.module = _module;
  }
}

export default GelatoProvider;
