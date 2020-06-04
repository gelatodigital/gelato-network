import { task, types } from "@nomiclabs/buidler/config";
import { constants, utils } from "ethers";

export default internalTask(
  "gc-return-taskspec-time-trade-ui",
  `Returns a hardcoded task spec for the timeTrade Script`
)
  .addFlag("log")
  .setAction(async ({ log }) => {
    try {
      if (network.name != "rinkeby") throw new Error("\nwrong network!");

      // ##### Condition
      const conditionAddress = await run("bre-config", {
        deployments: true,
        contractname: "ConditionTimeStateful",
      });

      const condition = new Condition({
        inst: conditionAddress,
      });

      // ##### Action # 1: Fee Action
      const feeRelayAddress = await run("gelato-get-fee-relay-address");
      console.log(feeRelayAddress);

      const feeRelayAction = new Action({
        addr: feeRelayAddress,
        data: constants.HashZero,
        operation: Operation.Delegatecall,
        termsOkCheck: true,
        value: 0,
      });

      // ##### Action #2
      const transferFromActionAddress = await run("bre-config", {
        deployments: true,
        contractname: "ActionERC20TransferFromGlobal",
      });

      const transferFromAction = new Action({
        addr: transferFromActionAddress,
        data: constants.HashZero,
        operation: Operation.Delegatecall,
        termsOkCheck: true,
      });

      // ##### Action #3
      const placeOrderBatchExchangeAddress = await run("bre-config", {
        deployments: true,
        contractname: "ActionPlaceOrderBatchExchange",
      });

      const placeOrderAction = new Action({
        addr: placeOrderBatchExchangeAddress,
        data: constants.HashZero,
        operation: Operation.Delegatecall,
        termsOkCheck: true,
      });

      // ##### Create Task Spec
      const taskSpec = new TaskSpec({
        conditions: [condition.inst],
        actions: [feeRelayAction, transferFromAction, placeOrderAction],
        gasPriceCeil: 0, // Infinte gas price
      });

      if (log) console.log(taskSpec);

      return taskSpec;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
