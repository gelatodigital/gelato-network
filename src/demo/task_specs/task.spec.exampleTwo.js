import { task, types } from "@nomiclabs/buidler/config";
import { constants, utils } from "ethers";

// Task Spec which enables users to sell on uniswap every X minutes, while charging a % fee from the sellAmount which goes to the provider

export default internalTask(
  "gelato-return-taskspec-example-two",
  `Returns a hardcoded task spec for the timeTrade Script`
)
  .addFlag("log")
  .setAction(async () => {
    try {
      // ##### Condition
      const conditionAddress = await run("bre-config", {
        deployments: true,
        contractname: "ConditionTimeStateful",
      });

      const condition = new Condition({
        inst: conditionAddress, // Address of the ConditionTimeStateful.sol
      });

      // @DEV Deploys a feeHandler Contract if you dont have one thus far
      // 0.5 == 0.5 % fee
      // Check out "src/demo/provider_functions/task.getFeeHandler.js" for more details
      let feeHandlerAddress = await run("gelato-get-fee-handler", {
        fee: "0.5",
      });

      // ##### Action #1
      // FeeHandler Action => Extracts a % fee from the users sellAmount
      const action1 = new Action({
        addr: feeHandlerAddress,
        // no need to include action.data for Task Specs
        operation: Operation.Delegatecall, // We are using an action Script here, see smart contract: ActionERC20TransferFrom.sol
        dataFlow: DataFlow.Out, // DataFlow.Out means that this action returns data that will be inputted into the next action,In this case the amount to be sold on uniswap - the provider fees
        termsOkCheck: true, // After the condition is checked, we will also conduct checks on the action contract
        value: 0, // Actions that use delegatecall always have value = 0
        data: constants.HashZero, // Task Specs dont need data
      });

      // ##### Action #2
      // 1. Get address from deployments.rinkeby file / or hardcode it
      const tradeUniswapAddress = await run("bre-config", {
        deployments: true,
        contractname: "ActionUniswapTrade",
      });

      const action2 = new Action({
        addr: tradeUniswapAddress,
        // no need to include action.data for Task Specs
        operation: Operation.Delegatecall, // We are using an action Script here, see smart contract: ActionERC20TransferFrom.sol
        dataFlow: DataFlow.In, // DataFlow.In as this action will accept the sellAmount returned by the FeeHandler Action
        termsOkCheck: false, // For Actions that receive DataFlow.In, ermsOkCheck can be set to false
        value: 0, // Actions that use delegatecall always have value = 0
        data: constants.HashZero, // Task Specs dont need data
      });

      // ##### Action #3
      const action3 = new Action({
        addr: conditionAddress, // We use the condition as an action (to dynamically set the timestamp when the users proxy contract can execute the actions next time)
        // no need to include action.data for Task Specs
        operation: Operation.Call, // We are calling the contract instance directly, without script
        dataFlow: DataFlow.None, // Only relevant if this action should return some value to the next, which it not necessary here
        termsOkCheck: false, // This action does not need a termsOk check
        value: 0, // Actions that use delegatecall always have value = 0
        data: constants.HashZero, // Task Specs dont need data
      });

      // ##### Create Task Spec
      const taskSpec = new TaskSpec({
        conditions: [condition.inst], // only need the condition inst address here
        actions: [action1, action2, action3], // Actions will be executed from left to right after each other. If one fails, all fail
        gasPriceCeil: 0, // Here providers can set the maximum gas price they are willing to pay. Set to 0 to allow any gas price
      });

      console.log(taskSpec);

      return taskSpec;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
