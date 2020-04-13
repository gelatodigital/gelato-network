class Action {
  constructor({ inst, data }) {
    if (!inst) throw new Error("\n Action: no inst passed to constructor \n ");
    if (!data) throw new Error("\n Action: no data passed to constructor \n ");
    this.inst = inst;
    this.data = data;
  }
}

export default Action;
