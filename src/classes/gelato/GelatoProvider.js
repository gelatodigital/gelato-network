class GelatoProvider {
  constructor({ addr, module }) {
    if (!addr)
      throw new Error("\n Provider: no addr passed to constructor \n ");
    if (!module)
      throw new Error("\n Provider: no module passed to constructor \n ");
    this.addr = addr;
    this.module = module;
  }
}

export default GelatoProvider;
