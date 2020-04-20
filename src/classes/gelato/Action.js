import { constants } from "ethers";

export const Operation = {
  Call: 0,
  Delegatecall: 1,
};

class Action {
  constructor({ inst, data, operation, value, termsOkCheck }) {
    if (!inst) throw new Error("\nAction: no inst passed to constructor\n");
    if (operation === undefined)
      throw new Error("\nAction: no operation passed to constructor\n");
    if (termsOkCheck !== true && termsOkCheck !== false) {
      throw new Error(
        "\nAction: pass 'true' or 'false', you passed:",
        termsOkCheck,
        "\n"
      );
    }

    if (
      operation !== Operation.Call &&
      operation !== Operation.Delegatecall &&
      operation !== 0 &&
      operation !== 1
    ) {
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
    this.operation = operation == Operation.Call || 0 ? 0 : 1;
    this.value = value ? value : constants.Zero;
    this.termsOkCheck = termsOkCheck;
  }
}

export default Action;
