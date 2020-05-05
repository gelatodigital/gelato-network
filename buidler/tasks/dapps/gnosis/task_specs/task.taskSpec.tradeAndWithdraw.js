import { task, types } from "@nomiclabs/buidler/config";
import { constants, utils } from "ethers";

export default internalTask(
  "gc-return-taskspec-tradeAndWithdraw",
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
      });

      // ##### Create Task Spec
      const taskSpec = new TaskSpec({
        actions: [withdrawTask],
        autoSubmitNextTask: false,
        gasPriceCeil: 0, // Infinte gas price
      });

      if (log) console.log(taskSpec);

      return taskSpec;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
