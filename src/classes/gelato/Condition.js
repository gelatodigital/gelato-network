class Condition {
  constructor({ inst, data }) {
    if (!inst)
      throw new Error("\n Condition: no inst passed to constructor \n ");
    if (!data)
      throw new Error("\n Condition: no data passed to constructor \n ");
    this.inst = inst;
    this.data = data;
  }
}

export default Condition;
