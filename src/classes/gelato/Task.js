import { constants } from "ethers";

class Task {
  constructor({ provider, conditions, actions, expiryDate, autoResubmitSelf }) {
    if (!provider) throw new Error("\nTask: no provider\n");
    if (conditions && !Array.isArray(conditions))
      throw new Error("\nTask: optional conditions must be non-empty Array\n");
    if (!actions || !Array.isArray(actions) || !actions.length)
      throw new Error("\nTask: actions must be non-empty Array\n");
    if (autoResubmitSelf && typeof autoResubmitSelf !== "boolean") {
      throw new Error("\nTask: autoResubmitSelf must be boolean if defined\n");
    }

    this.provider = provider;
    this.conditions = conditions ? conditions : [];
    this.actions = actions;
    this.expiryDate = expiryDate ? expiryDate : constants.Zero;
    this.autoResubmitSelf = autoResubmitSelf ? true : false;
  }
}

export default Task;
