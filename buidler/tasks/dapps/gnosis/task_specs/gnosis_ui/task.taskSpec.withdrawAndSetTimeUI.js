import { task, types } from "@nomiclabs/buidler/config";
import { constants, utils } from "ethers";

export default internalTask(
  "gelato-return-taskspec-withdraw-and-set-time-ui",
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
        dataflow: DataFlow.Out,
      });

      // ##### Action #2
      const actionTransferAddress = await run("bre-config", {
        deployments: true,
        contractname: "ActionTransfer",
      });

      const transferAction = new Action({
        addr: actionTransferAddress,
        data: constants.HashZero,
        operation: Operation.Delegatecall,
        termsOkCheck: true,
        dataflow: DataFlow.In,
      });

      // ##### Action #3
      const setCondition = new Action({
        addr: conditionAddress,
        data: constants.HashZero,
        operation: Operation.Call,
      });

      // ##### Create Task Spec
      const taskSpec = new TaskSpec({
        actions: [withdrawAction, transferAction, setCondition],
        gasPriceCeil: 0, // Infinte gas price
      });

      if (log) console.log(taskSpec);

      return taskSpec;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
