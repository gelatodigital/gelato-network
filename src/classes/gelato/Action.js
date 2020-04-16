import { constants } from "ethers";

class Action {
  constructor({ inst, data, operation, value, termsOkCheck }) {
    if (!inst) throw new Error("\nAction: no inst passed to constructor\n");
    if (!operation)
      throw new Error("\nAction: no operation passed to constructor\n");
    if (termsOkCheck !== true && termsOkCheck !== false) {
      throw new Error(
        "\nAction: pass 'true' or 'false', you passed:",
        termsOkCheck,
        "\n"
      );
    }

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
    this.data = data ? data : constants.HashZero;
    this.operation = operation == "call" ? 0 : 1;
    this.value = value ? value : constants.Zero;
    this.termsOkCheck = termsOkCheck;
  }
}

export default Action;
