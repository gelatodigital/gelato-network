import { constants } from "ethers";

// TaskSpec
class TaskSpec {
  constructor({ conditionInst, actions, gasPriceCeil }) {
    if (!actions || !actions.length)
      throw new Error("\n TaskSpec: no actions passed to constructor \n ");
    if (!gasPriceCeil)
      throw new Error("\n TaskSpec: no gasPriceCeil passed to constructor \n ");
    this.condition = conditionInst ? conditionInst : constants.AddressZero;
    this.actions = actions;
    this.gasPriceCeil = gasPriceCeil;
  }
}

export default TaskSpec;
