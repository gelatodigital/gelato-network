class Task {
  constructor({ provider, condition, actions, expiryDate }) {
    if (!provider) throw new Error("Task: no provider");
    if (!condition) throw new Error("Task: no condition");
    if (!actions || !actions.length) throw new Error("Task: no actions");
    if (!expiryDate) throw new Error("Task: no expiryDate");

    this.provider = provider;
    this.condition = condition;
    this.actions = actions;
    this.expiryDate = expiryDate;
  }
}

export default Task;
