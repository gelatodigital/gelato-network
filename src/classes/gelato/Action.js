class Action {
  constructor({ inst, data, operation }) {
    if (!inst) throw new Error("\nAction: no inst passed to constructor\n");
    if (!data) throw new Error("\nAction: no data passed to constructor\n");
    if (!operation)
      throw new Error("\nAction: no operation passed to constructor\n");
    if (operation !== "call" && operation !== "delegatecall") {
      throw new Error(
        "\nAction: pass 'call' or 'delegatecall', you passed:",
        operation,
        "\n"
      );
    }
    this.inst = inst;
    this.data = data;
    this.operation = operation == "call" ? 0 : 1;
  }
}

export default Action;
