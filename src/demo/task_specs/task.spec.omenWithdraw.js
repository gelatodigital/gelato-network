import { task, types } from "@nomiclabs/buidler/config";
import { constants, utils } from "ethers";

export default internalTask(
  "gelato-return-taskspec-omen-withdraw",
  `Returns a hardcoded task spec for the timeTrade Script`
)
  .addFlag("log")
  .setAction(async ({ log }) => {
    try {
      // ##### Condition
      const conditionAddress = await run("bre-config", {
        deployments: true,
        contractname: "ConditionTime",
      });

      const condition = new Condition({
        inst: conditionAddress, // Address of the ConditionTimeStateful.sol
      });

      // ##### Action #1
      // 1. Get address from deployments.rinkeby file / or hardcode it
      const actionAddress = await run("bre-config", {
        deployments: true,
        contractname: "ActionWithdrawLiquidity",
      });

      const action1 = new Action({
        addr: actionAddress,
        data: constants.HashZero,
        operation: Operation.Delegatecall,
        dataFlow: DataFlow.None,
        value: 0,
        termsOkCheck: false,
      });

      // ##### Create Task Spec
      const taskSpec = new TaskSpec({
        conditions: [condition.inst], // only need the condition inst address here
        actions: [action1], // Actions will be executed from left to right after each other. If one fails, all fail
        gasPriceCeil: 0, // Here providers can set the maximum gas price they are willing to pay. Set to 0 to allow any gas price
      });

      console.log(taskSpec);

      return taskSpec;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
