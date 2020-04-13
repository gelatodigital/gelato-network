class Action {
  constructor({ addr, data }) {
    if (!addr) throw new Error("\n Action: no addr passed to constructor \n ");
    if (!data) throw new Error("\n Action: no data passed to constructor \n ");
    this.addr = addr;
    this.data = data;
  }
}

export default Action;
