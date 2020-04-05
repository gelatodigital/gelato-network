import { constants, utils } from "ethers";

class ExecClaim {
  constructor(execClaimObj) {
    try {
      if (!execClaimObj.actionPayload)
        throw new Error("undefined actionPayload");

      this.id = constants.HashZero;
      this.provider = utils.getAddress(execClaimObj.provider);
      this.providerModule = utils.getAddress(execClaimObj.providerModule);
      this.userProxy = constants.AddressZero;
      this.condition = execClaimObj.condition
        ? utils.getAddress(execClaimObj.condition)
        : constants.AddressZero;
      this.action = utils.getAddress(execClaimObj.action);
      this.conditionPayload = execClaimObj.conditionPayload
        ? execClaimObj.conditionPayload
        : constants.HashZero;
      this.actionPayload = execClaimObj.actionPayload;
      this.expiryDate = execClaimObj.expiryDate
        ? execClaimObj.expiryDate
        : constants.HashZero;
    } catch (error) {
      console.error(`\n ExecClaim Class: \n`, error);
      process.exit(1);
    }
  }
}

export default ExecClaim;
