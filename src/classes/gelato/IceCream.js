// IceCream
class IceCream {
  constructor({ condition, actions, gasPriceCeil }) {
    if (!condition)
      throw new Error("\n IceCream: no condition passed to constructor \n ");
    if (!actions || !actions.length)
      throw new Error("\n IceCream: no actions passed to constructor \n ");
    if (!gasPriceCeil)
      throw new Error("\n IceCream: no gasPriceCeil passed to constructor \n ");
    this.condition = condition;
    this.actions = actions;
    this.gasPriceCeil = gasPriceCeil;
  }
}

export default IceCream;