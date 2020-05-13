import checkTaskMembers from "../../helpers/gelato/checkTaskMembers";

class Task {
  constructor({ provider, conditions, actions }) {
    checkTaskMembers({ provider, conditions, actions });
    this.provider = provider;
    this.conditions = conditions ? conditions : [];
    this.actions = actions;
  }
}

export default Task;
