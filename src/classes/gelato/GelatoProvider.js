class GelatoProvider {
  constructor({ addr, module: _module }) {
    if (!addr) throw new Error("\nProvider: no addr passed to constructor \n");
    if (!module)
      throw new Error("\nProvider: no module passed to constructor\n");
    this.addr = addr;
    this.module = _module;
  }
}

export default GelatoProvider;
