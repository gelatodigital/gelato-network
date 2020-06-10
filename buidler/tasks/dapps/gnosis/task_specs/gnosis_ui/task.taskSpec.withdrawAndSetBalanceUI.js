import { task, types } from "@nomiclabs/buidler/config";
import { constants, utils } from "ethers";

export default internalTask(
  "gelato-return-taskspec-withdraw-and-set-balance-ui",
  `Returns a hardcoded task spec for the timeTrade Script`
)
  .addFlag("log")
  .setAction(async ({ log }) => {
    try {
      if (network.name != "rinkeby") throw new Error("\nwrong network!");

      // ##### Condition
      const conditionAddress = await run("bre-config", {
        deployments: true,
        contractname: "ConditionBatchExchangeStateful",
      });

      const condition = new Condition({
        inst: conditionAddress,
        data: constants.HashZero,
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

      // ##### Create Task Spec
      const taskSpec = new TaskSpec({
        conditions: [condition],
        actions: [withdrawAction, transferAction],
        gasPriceCeil: 0, // Infinte gas price
      });

      if (log) console.log(taskSpec);

      return taskSpec;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
