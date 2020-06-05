import checkTaskMembers from "../../helpers/gelato/checkTaskMembers";

class Task {
  constructor({ conditions, actions, selfProviderGasPriceCeil }) {
    checkTaskMembers({ conditions, actions });
    this.conditions = conditions ? conditions : [];
    this.actions = actions;
    this.selfProviderGasPriceCeil = selfProviderGasPriceCeil
      ? selfProviderGasPriceCeil
      : 0;
  }
}

export default Task;
