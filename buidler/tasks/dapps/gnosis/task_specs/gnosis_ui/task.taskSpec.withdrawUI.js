import { task, types } from "@nomiclabs/buidler/config";
import { constants, utils } from "ethers";

export default internalTask(
  "gelato-return-taskspec-withdraw-ui",
  `Returns a hardcoded task spec for the timeTrade Script`
)
  .addFlag("log")
  .setAction(async ({ log }) => {
    try {
      // ##### Condition #1
      const conditionBatchExchangeWithdrawStateful = await run("bre-config", {
        deployments: true,
        contractname: "ConditionBatchExchangeWithdrawStateful",
      });

      const condition = new Condition({
        inst: conditionBatchExchangeWithdrawStateful,
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
        dataFlow: DataFlow.Out,
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
        termsOkCheck: false,
        dataFlow: DataFlow.In,
      });

      // Execute withdraw and transfer twice, as we request 2 withdrawal requests for 2 different tokens
      // ##### Create Task Spec
      const taskSpec = new TaskSpec({
        conditions: [condition.inst],
        actions: [
          withdrawAction,
          transferAction,
          withdrawAction,
          transferAction,
        ],
        gasPriceCeil: 0, // Infinte gas price
      });

      if (log) console.log(taskSpec);

      return taskSpec;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
