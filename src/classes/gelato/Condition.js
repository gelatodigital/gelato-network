import { constants } from "ethers";

class Condition {
  constructor({ inst, data }) {
    this.inst = inst ? inst : constants.AddressZero;
    this.data = data ? data : constants.HashZero;
  }
}

export default Condition;
