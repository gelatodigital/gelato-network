import { constants } from "ethers";

class Condition {
  constructor({ addr, data }) {
    this.addr = addr ? addr : constants.AddressZero;
    this.data = data ? data : constants.HashZero;
  }
}

export default Condition;
