import { constants } from "ethers";
import Condition from "./Condition";

class Task {
  constructor({ provider, condition, actions, expiryDate }) {
    if (!provider) throw new Error("Task: no provider");
    if (!actions || !actions.length) throw new Error("Task: no actions");

    this.provider = provider;
    this.condition = condition
      ? condition
      : new Condition({ inst: undefined, data: undefined });
    this.actions = actions;
    this.expiryDate = expiryDate ? expiryDate : constants.Zero;
  }
}

export default Task;
