import { task, types } from "@nomiclabs/buidler/config";
import { constants, utils } from "ethers";

export default internalTask(
  "gc-return-taskspec-balanceTrade",
  `Returns a hardcoded task spec for the Balance Trade Script`
)
  .addFlag("log")
  .setAction(async ({ log }) => {
    try {
      if (network.name != "rinkeby") throw new Error("\nwrong network!");

      // ##### Condition
      const conditionAddress = await run("bre-config", {
        deployments: true,
        contractname: "ConditionBalanceStateful",
      });

      const condition = new Condition({
        inst: conditionAddress,
      });

      // ##### Action #1
      const placeOrderBatchExchangeAddress = await run("bre-config", {
        deployments: true,
        contractname: "ActionPlaceOrderBatchExchange",
      });

      const placeOrderAction = new Action({
        addr: placeOrderBatchExchangeAddress,
        operation: Operation.Delegatecall,
        termsOkCheck: true,
      });

      // ##### Action #2
      const setConditionBalanceAction = new Action({
        addr: conditionAddress,
        operation: Operation.Call,
        termsOkCheck: false,
      });

      // ##### Create Task Spec
      const taskSpec = new TaskSpec({
        conditions: [condition.inst],
        actions: [placeOrderAction, setConditionBalanceAction],
        autoSubmitNextTask: true,
        gasPriceCeil: 0, // Infinte gas price
      });

      if (log) console.log(taskSpec);

      return taskSpec;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
