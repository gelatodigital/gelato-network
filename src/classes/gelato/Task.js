import checkTaskMembers from "../../helpers/gelato/checkTaskMembers";

class Task {
  constructor({
    conditions,
    actions,
    selfProviderGasLimit,
    selfProviderGasPriceCeil,
  }) {
    checkTaskMembers({ conditions, actions });
    this.conditions = conditions ? conditions : [];
    this.actions = actions;
    this.selfProviderGasLimit = selfProviderGasLimit ? selfProviderGasLimit : 0;
    this.selfProviderGasPriceCeil = selfProviderGasPriceCeil
      ? selfProviderGasPriceCeil
      : 0;
  }
}

export default Task;
