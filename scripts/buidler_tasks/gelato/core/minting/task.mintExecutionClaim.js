import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gelato-core-mintexecutionclaim",
  `Sends tx to GelatoCore.mintExecutionClaim() on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("triggername", "must exist inside buidler.config")
  .addPositionalParam("triggerPayloadWithSelector", "abi.encoded bytes")
  .addPositionalParam("actionname", "must exist inside buidler.config")
  .addPositionalParam("actionPayloadWithSelector", "abi.encoded bytes")
  .addOptionalPositionalParam("selectedexecutor", "address")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async taskArgs => {
    try {
      // To avoid mistakes default log to true
      taskArgs.log = true;

      // Handle executor
      selectedexecutor = await run("handleExecutor", { selectedexecutor });

      const triggerAddress = await run("bre-config", {
        deployments: true,
        contractname: taskArgs.triggername
      });
      const actionAddress = await run("bre-config", {
        deployments: true,
        contractname: taskArgs.actionname
      });

      // GelatoCore write Instance
      const gelatoCoreContract = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true
      });
      // mintExecutionClaim TX
      const mintTx = await gelatoCoreContract.mintExecutionClaim(
        selectedexecutor,
        triggerAddress,
        taskArgs.triggerPayloadWithSelector,
        actionAddress,
        taskArgs.actionPayloadWithSelector
      );

      if (log)
        console.log(
          `\n\ntxHash gelatoCore.mintExectuionClaim: ${mintTx.hash}\n`
        );
      await mintTx.wait();
      return mintTx.hash;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
