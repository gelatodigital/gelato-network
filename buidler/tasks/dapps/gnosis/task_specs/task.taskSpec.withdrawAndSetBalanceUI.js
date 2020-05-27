import { task, types } from "@nomiclabs/buidler/config";
import { constants, utils } from "ethers";

export default internalTask(
  "gc-return-taskspec-withdraw-and-set-balance-ui",
  `Returns a hardcoded task spec for the timeTrade Script`
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

      // ##### Action #1
      const withdrawBatchExchangeAddress = await run("bre-config", {
        deployments: true,
        contractname: "ActionWithdrawBatchExchange",
      });

      const withdrawAction = new Action({
        addr: withdrawBatchExchangeAddress,
        data: constants.HashZero,
        operation: Operation.Delegatecall,
        termsOkCheck: true,
      });

      // ##### Action #1
      const setCondition = new Action({
        addr: conditionAddress,
        data: constants.HashZero,
        operation: Operation.Call,
      });

      // ##### Create Task Spec
      const taskSpec = new TaskSpec({
        actions: [withdrawAction, setCondition],
        gasPriceCeil: 0, // Infinte gas price
      });

      if (log) console.log(taskSpec);

      return taskSpec;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
