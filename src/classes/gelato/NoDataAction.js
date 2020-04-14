class NoDataAction {
  constructor({ inst, operation, termsOkCheck }) {
    if (!inst) throw new Error("\nAction: no inst passed to constructor\n");
    if (!operation)
      throw new Error("\nAction: no operation passed to constructor\n");
    if (operation !== "call" && operation !== "delegatecall") {
      throw new Error(
        "\nAction: pass 'call' or 'delegatecall', you passed:",
        operation,
        "\n"
      );
    }
    if (termsOkCheck === undefined)
      throw new Error("\nAction: no termsOkCheck passed to constructor\n");
    this.inst = inst;
    this.operation = operation == "call" ? 0 : 1;
    this.termsOkCheck = termsOkCheck;
  }
}

export default NoDataAction;
