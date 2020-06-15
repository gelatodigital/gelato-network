import { task, types } from "@nomiclabs/buidler/config";
import { constants, utils } from "ethers";

export default internalTask(
  "gc-return-taskspec-withdraw-transfer",
  `Returns a hardcoded task spec for the tradeAndWithdraw Script`
)
  .addFlag("log")
  .setAction(async ({ log }) => {
    try {
      if (network.name != "rinkeby") throw new Error("\nwrong network!");

      // ##### Condition => NONE

      // ##### Action #1
      const actionAddress = await run("bre-config", {
        contractname: "ActionWithdrawBatchExchange",
        deployments: true,
      });

      const actionWithdrawBatchExchange = new Action({
        addr: actionAddress,
        data: constants.HashZero,
        operation: 1,
        value: 0,
        termsOkCheck: true,
        dataFlow: DataFlow.Out,
      });

      // ##### Action #2
      const actionTransferAddress = await run("bre-config", {
        contractname: "ActionTransfer",
        deployments: true,
      });

      const actionTransferAction = new Action({
        addr: actionTransferAddress,
        data: constants.HashZero,
        operation: 1,
        value: 0,
        termsOkCheck: true,
        dataFlow: DataFlow.In,
      });

      // ##### Create Task Spec
      const taskSpec = new TaskSpec({
        actions: [
          actionWithdrawBatchExchange,
          actionTransferAction,
          actionWithdrawBatchExchange,
          actionTransferAction,
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
