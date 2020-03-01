import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-mint",
  `Sends tx to GelatoCore.mintExecutionClaim() on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("conditionname", "must exist inside buidler.config")
  .addPositionalParam("actionname", "must exist inside buidler.config")
  .addPositionalParam("provider", "The selected provider")
  .addOptionalPositionalParam("conditionPayload", "abi.encoded bytes")
  .addOptionalPositionalParam("actionPayload", "abi.encoded bytes")
  .addOptionalParam("selectedexecutor", "address")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async taskArgs => {
    try {
      // To avoid mistakes default log to true
      taskArgs.log = true;

      const selectedProvider = await run("bre-config", {
        addressbookcategory: "provider",
        addressbookentry: "default"
      });

      // Handle executor
      const selectedexecutor = await run("handleExecutor", {
        selectedexecutor: taskArgs.selectedexecutor
      });

      // Handle condition action addresses
      const conditionAddress = await run("bre-config", {
        deployments: true,
        contractname: taskArgs.conditionname
      });
      const actionAddress = await run("bre-config", {
        deployments: true,
        contractname: taskArgs.actionname
      });

      // Handle condition payloadsWithSelector
      let conditionPayload;
      if (!taskArgs.conditionPayload) {
        conditionPayload = await run(
          `gc-mint:defaultpayload:${taskArgs.conditionname}`
        );
      } else {
        conditionPayload = taskArgs.conditionPayload;
      }
      // Handle action payloadsWithSelector
      let actionPayload;
      if (!taskArgs.actionPayload) {
        actionPayload = await run(
          `gc-mint:defaultpayload:${taskArgs.actionname}`
        );
      } else {
        actionPayload = taskArgs.actionPayload;
      }

      // GelatoCore write Instance
      const gelatoCoreContract = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true
      });
      // mintExecutionClaim TX (payable)
      const mintTx = await gelatoCoreContract.mintExecutionClaim(
        [selectedProvider, selectedexecutor],
        [conditionAddress, actionAddress],
        conditionPayload,
        actionPayload
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
