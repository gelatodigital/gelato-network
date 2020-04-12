import { constants, utils } from "ethers";

class Task {
  constructor(taskObj) {
    try {
      if (!taskObj.actionPayload)
        throw new Error("undefined Task.actionPayload");

      this.provider = utils.getAddress(taskObj.provider);
      this.providerModule = utils.getAddress(taskObj.providerModule);
      this.condition = taskObj.condition
        ? utils.getAddress(taskObj.condition)
        : constants.AddressZero;
      this.actions = [
        utils.getAddress(taskObj.action),
        utils.getAddress(taskObj.action),
      ];
      this.conditionPayload = taskObj.conditionPayload
        ? taskObj.conditionPayload
        : constants.HashZero;
      this.actionsPayload = [taskObj.actionPayload, taskObj.actionPayload];
      this.expiryDate = taskObj.expiryDate
        ? taskObj.expiryDate
        : constants.Zero;
    } catch (error) {
      console.error(`\n Task Class: \n`, error);
      process.exit(1);
    }
  }
}

export default Task;
