import checkTaskMembers from "../../helpers/gelato/checkTaskMembers";

class Task {
  constructor({ conditions, actions }) {
    checkTaskMembers({ conditions, actions });
    this.conditions = conditions ? conditions : [];
    this.actions = actions;
  }
}

export default Task;
