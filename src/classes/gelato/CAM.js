// ConditionActionsMix
class CAM {
  constructor({ condition, noDataActions, gasPriceCeil }) {
    if (!condition)
      throw new Error("\n CAM: no condition passed to constructor \n ");
    if (!noDataActions || !noDataActions.length)
      throw new Error("\n CAM: no noDataActions passed to constructor \n ");
    if (!gasPriceCeil)
      throw new Error("\n CAM: no gasPriceCeil passed to constructor \n ");
    this.condition = condition;
    this.noDataActions = noDataActions;
    this.gasPriceCeil = gasPriceCeil;
  }
}

export default CAM;
