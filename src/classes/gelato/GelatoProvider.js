import { constants } from "ethers";

class GelatoProvider {
  constructor({ addr, module }) {
    if (!addr)
      throw new Error("\n Provider: no addr passed to constructor \n ");
    this.addr = addr;
    this.module = module ? module : constants.AddressZero;
  }
}

export default GelatoProvider;
