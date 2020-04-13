import { constants } from "ethers";

class GelatoProvider {
  constructor({ inst, module }) {
    if (!inst)
      throw new Error("\n Provider: no inst passed to constructor \n ");
    this.inst = inst;
    this.module = module ? module : constants.AddressZero;
  }
}

export default GelatoProvider;
