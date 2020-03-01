import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-mint",
  `Sends tx to GelatoCore.mintExecutionClaim() on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("conditionname", "must exist inside buidler.config")
  .addPositionalParam("actionname", "must exist inside buidler.config")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async taskArgs => {
    try {
      // To avoid mistakes default log to true
      taskArgs.log = true;

      // ======== ETH LONDON
      const selectedProvider = await run("bre-config", {
        addressbookcategory: "provider",
        addressbookentry: "default"
      });
      const selectedExecutor = await run("bre-config", {
        addressbookcategory: "executor",
        addressbookentry: "default"
      });
      const { ConditionFearGreedIndex: condition } = await run("bre-config", {
        deployments:true
      });
      const { ActionRebalancePortfolio: action } = await run("bre-config", {
        deployments:true
      });

      const conditionPayload = await run("abi-encode-withselector", {
        contractname: "ConditionFearGreedIndex",
        functionname: "reached",
        inputs: [50]
      });

      const actionPayload = await run("abi-encode-withselector", {
        contractname: "ActionRebalancePortfolio",
        functionname: "action",
        inputs: []
      });
      // ====================

      // GelatoCore write Instance
      const gelatoCoreContract = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true
      });
      // mintExecutionClaim TX (payable)
      const mintTx = await gelatoCoreContract.mintExecutionClaim(
        [selectedProvider, selectedExecutor],
        [condition, action],
        conditionPayload,
        actionPayload,
      );

      if (taskArgs.log)
        console.log(
          `\n\ntxHash gelatoCore.mintExecutionClaim: ${mintTx.hash}\n`
        );
      await mintTx.wait();
      return mintTx.hash;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
