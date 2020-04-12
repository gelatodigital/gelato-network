import { constants, utils } from "ethers";

class Task {
  constructor(taskObj) {
    try {
      if (!taskObj.actionsPayload)
        throw new Error("undefined Task.actionPayload");

      this.provider = utils.getAddress(taskObj.provider);
      this.providerModule = utils.getAddress(taskObj.providerModule);
      this.condition = taskObj.condition
        ? utils.getAddress(taskObj.condition)
        : constants.AddressZero;
      this.actions = [];
      taskObj.actions.forEach((action) => {
        this.actions.push(utils.getAddress(action));
      });
      this.conditionPayload = taskObj.conditionPayload
        ? taskObj.conditionPayload
        : constants.HashZero;
      this.actionsPayload = taskObj.actionsPayload;
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
