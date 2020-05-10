import { task, types } from "@nomiclabs/buidler/config";
import { constants, utils } from "ethers";

export default internalTask(
  "gc-return-taskspec-kyberPriceTrade",
  `Returns a hardcoded task spec for the kyberPriceTrade Script`
)
  .addFlag("log")
  .setAction(async ({ log }) => {
    try {
      if (network.name != "rinkeby") throw new Error("\nwrong network!");

      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true,
        // signer: provider,
      });

      // ##### Condition
      const conditionAddress = await run("bre-config", {
        deployments: true,
        contractname: "ConditionKyberRate",
      });

      // ##### Action #1
      const actionPlaceOrderBatchExchangePayFeeAddress = await run(
        "bre-config",
        {
          deployments: true,
          contractname: "ActionPlaceOrderBatchExchangePayFee",
        }
      );

      const realPlaceOrderAction = new Action({
        addr: actionPlaceOrderBatchExchangePayFeeAddress,
        data: constants.HashZero,
        operation: 1,
        value: 0,
        termsOkCheck: true,
      });

      // ##### Action #2
      const submitTaskAction = new Action({
        addr: gelatoCore.address,
        data: constants.HashZero,
        operation: Operation.Call,
        value: 0,
        termsOkCheck: false,
      });

      // ##### Create Task Spec
      const taskSpec = new TaskSpec({
        conditions: [conditionAddress],
        actions: [realPlaceOrderAction, submitTaskAction],
        gasPriceCeil: 0, // Infinte gas price
      });

      if (log) console.log(taskSpec);

      return taskSpec;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
