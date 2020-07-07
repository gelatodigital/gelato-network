import { task, types } from "@nomiclabs/buidler/config";
import { constants, utils } from "ethers";

export default internalTask(
  "gelato-return-taskspec-kyber-price-trade-ui",
  `Returns a hardcoded task spec for the timeTrade Script`
)
  .addFlag("log")
  .setAction(async ({ log }) => {
    try {
      // ##### Condition
      const conditionAddress = await run("bre-config", {
        deployments: true,
        contractname: "ConditionKyberRateStateful",
      });

      const condition = new Condition({
        inst: conditionAddress,
      });

      // ==== Actions

      // FeeHandler, PlaceOrder, SetConditionStateful (with delta = 1), SetConditionBatchExchangeStateful, Submit Task 2

      // ##### Action #1
      const erc20TransferFromAddress = await run("bre-config", {
        deployments: true,
        contractname: "ActionERC20TransferFrom",
      });

      const actionERC20TransferFrom = new Action({
        addr: erc20TransferFromAddress,
        data: constants.HashZero,
        operation: Operation.Delegatecall,
        termsOkCheck: true,
        dataFlow: DataFlow.None,
      });

      // ##### Action #2
      const placeOrderBatchExchangeAddress = await run("bre-config", {
        deployments: true,
        contractname: "ActionPlaceOrderBatchExchangeWithSlippage",
      });

      const placeOrderAction = new Action({
        addr: placeOrderBatchExchangeAddress,
        data: constants.HashZero,
        operation: Operation.Delegatecall,
        termsOkCheck: true,
        dataFlow: DataFlow.None,
      });

      // ##### Action #3
      const setConditionAction = new Action({
        addr: conditionAddress,
        data: constants.HashZero,
        operation: Operation.Call,
        termsOkCheck: false,
        dataFlow: DataFlow.None,
      });

      // ##### Action #4
      const conditionBatchExchangeStatefulAddress = await run("bre-config", {
        deployments: true,
        contractname: "ConditionBatchExchangeWithdrawStateful",
      });

      const setBatchExchangeConditionAction = new Action({
        addr: conditionBatchExchangeStatefulAddress,
        data: constants.HashZero,
        operation: Operation.Call,
        termsOkCheck: false,
        dataFlow: DataFlow.None,
      });

      // ##### Action #5
      const gelatoCoreAddress = await run("bre-config", {
        deployments: true,
        contractname: "GelatoCore",
      });

      const gelatoCoreAction = new Action({
        addr: gelatoCoreAddress,
        data: constants.HashZero,
        operation: Operation.Call,
        termsOkCheck: false,
        dataFlow: DataFlow.None,
      });

      // ##### Create Task Spec
      const taskSpec = new TaskSpec({
        conditions: [condition.inst],
        actions: [
          actionERC20TransferFrom,
          placeOrderAction,
          setConditionAction,
          setBatchExchangeConditionAction,
          gelatoCoreAction,
        ],
        gasPriceCeil: ethers.utils.parseUnits("50", "gwei"), // 50 Gwei
      });

      if (log) console.log(taskSpec);

      return taskSpec;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
