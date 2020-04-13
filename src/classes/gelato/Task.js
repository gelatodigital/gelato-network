import { constants } from "ethers";

class Task {
  constructor({ provider, condition, actions, expiryDate }) {
    if (!provider) throw new Error("Task: no provider");
    if (!condition) throw new Error("Task: no condition");
    if (!actions || !actions.length) throw new Error("Task: no actions");

    this.provider = provider;
    this.condition = condition;
    this.actions = actions;
    this.expiryDate = expiryDate ? expiryDate : constants.Zero;
  }
}

export default Task;
