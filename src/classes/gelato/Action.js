import { constants } from "ethers";

export const Operation = {
  Call: 0,
  Delegatecall: 1,
};

class Action {
  constructor({ addr, data, operation, value, termsOkCheck }) {
    if (!addr) throw new Error("\nAction: no addr passed to constructor\n");
    if (operation === undefined)
      throw new Error("\nAction: no operation passed to constructor\n");
    if (operation !== Operation.Call && operation !== Operation.Delegatecall) {
      throw new Error(
        "\nAction: pass 'Operation.Call' or 'Operation.Delegatecall', you passed:",
        operation,
        "\n CASE SENSITIVE => .call or .delegatecall do not work!",
        "\n"
      );
    }
    const trueOrFalse = [true, false];
    if (termsOkCheck !== undefined && !trueOrFalse.includes(termsOkCheck)) {
      throw new Error(
        "\nAction.termsOkCheck: pass true or false, you passed:",
        termsOkCheck,
        "\n"
      );
    }

    this.addr = addr;
    this.data = data ? data : constants.HashZero;
    this.operation = operation;
    this.value = value ? value : constants.Zero;
    this.termsOkCheck = termsOkCheck ? termsOkCheck : false;
  }
}

export default Action;
