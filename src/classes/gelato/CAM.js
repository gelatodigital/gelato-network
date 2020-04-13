import { constants } from "ethers";

// ConditionActionsMix
class CAM {
  constructor({ condition, actions, gasPriceCeil }) {
    if (!condition)
      throw new Error("\n CAM: no condition passed to constructor \n ");
    if (!actions || !actions.length)
      throw new Error("\n CAM: no actions passed to constructor \n ");
    this.condition = condition;
    this.actions = actions;
    this.gasPriceCeil = gasPriceCeil ? gasPriceCeil : constants.Zero;
  }
}

export default CAM;