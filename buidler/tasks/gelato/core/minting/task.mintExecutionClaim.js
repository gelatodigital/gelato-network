import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-mint",
  `Sends tx to GelatoCore.mintExecutionClaim() on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("conditionname", "must exist inside buidler.config")
  .addPositionalParam("actionname", "must exist inside buidler.config")
  .addOptionalPositionalParam(
    "selectedprovider",
    "defaults to network addressbook default"
  )
  .addOptionalPositionalParam(
    "selectedexecutor",
    "defaults to network addressbook default"
  )
  .addOptionalPositionalParam(
    "conditionpayload",
    "If not provided, must have a default returned from handlePayload()"
  )
  .addOptionalPositionalParam(
    "actionpayload",
    "If not provided, must have a default returned from handlePayload()"
  )
  .addOptionalPositionalParam(
    "executionclaimexpirydate",
    "defaults to 0 for selectedexecutor's maximum",
    0,
    types.int
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async taskArgs => {
    try {
      // To avoid mistakes default log to true
      taskArgs.log = true;

      // Sanitize commandline input
      const selectedProvider = await run("handleProvider", {
        provider: taskArgs.selectedprovider
      });
      const selectedExecutor = await run("handleExecutor", {
        executor: taskArgs.selectedexecutor
      });
      const conditionAddress = await run("bre-config", {
        deployments: true,
        contractname: taskArgs.conditionname
      });
      const actionAddress = await run("bre-config", {
        deployments: true,
        contractname: taskArgs.actionname
      });
      const conditionPayload = await run("handlePayload", {
        contractname: taskArgs.conditionname,
        payload: taskArgs.conditionpayload
      });
      const actionPayload = await run("handlePayload", {
        contractname: taskArgs.actionname,
        payload: taskArgs.actionpayload
      });

      // GelatoCore write Instance
      const gelatoCoreContract = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true
      });

      // mintExecutionClaim TX
      const mintTx = await gelatoCoreContract.mintExecutionClaim(
        [selectedProvider, selectedExecutor],
        [conditionAddress, actionAddress],
        conditionPayload,
        actionPayload,
        taskArgs.executionclaimexpirydate
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
