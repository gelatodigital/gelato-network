import { internalTask } from "@nomiclabs/buidler/config";
import { AddressZero } from "ethers/constants";
import { BigNumber } from "ethers/utils";

export default internalTask(
  "gc-submit:defaultpayload:ActionChainedRebalancePortfolioKovan",
  `Returns a hardcoded actionData of ActionChainedRebalancePortfolioKovan`
)
  .addOptionalPositionalParam(
    "executorindex",
    "which mnemoric index should be selected for gelatoExecutor msg.sender (default index 0)",
    1,
    types.int
  )
  .addOptionalPositionalParam(
    "providerindex",
    "which mnemoric index should be selected for provider (default index 0)",
    2,
    types.int
  )
  .addFlag("log")
  .setAction(async ({ executorindex = 1, providerindex = 2, log = true }) => {
    try {
      const signers = await ethers.getSigners();
      const gelatoExecutor = signers[parseInt(executorindex)];
      const provider = signers[parseInt(providerindex)];
      const providerAndExecutor = [provider._address, gelatoExecutor._address];

      const actionContract = await run("instantiateContract", {
        contractname: "ActionChainedRebalancePortfolioKovan",
        read: true,
        log
      });

      const conditionContract = await run("instantiateContract", {
        contractname: "ConditionFearGreedIndex",
        read: true,
        log
      });

      const conditionAndAction = [
        conditionContract.address,
        actionContract.address
      ];

      const actionData = await run("abi-encode-withselector", {
        contractname: "ActionChainedRebalancePortfolioKovan",
        functionname: "chainedAction",
        inputs: [providerAndExecutor, conditionAndAction],
        log
      });

      if (log) console.log(actionData);
      return actionData;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
