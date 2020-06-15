import { constants } from "ethers";
import Operation from "../../enums/gelato/Operation";
import DataFlow from "../../enums/gelato/DataFlow";

class Action {
  constructor({ addr, data, operation, dataFlow, value, termsOkCheck }) {
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
    if (
      operation == Operation.Delegatecall &&
      value &&
      value.toString() !== "0"
    ) {
      throw new Error(
        "\n Action: Delegatecalls must have 0 in the value field"
      );
    }
    if (dataFlow && Object.values(DataFlow).indexOf(dataFlow) === -1)
      throw new Error("\n Action: Invalid DataFlow value \n");
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
    this.dataFlow = dataFlow !== undefined ? dataFlow : DataFlow.None;
    this.value = value ? value : constants.Zero;
    this.termsOkCheck = termsOkCheck === true ? termsOkCheck : false;
  }
}

export default Action;
