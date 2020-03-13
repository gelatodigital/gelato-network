import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";
import { constants } from "ethers";

export default task(
  "gc-mint",
  `Sends tx to GelatoCore.mintExecutionClaim() on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam(
    "actionname",
    "This param MUST be supplied. Must exist inside buidler.config"
  )
  .addOptionalPositionalParam(
    "conditionname",
    "Must exist inside buidler.config. Defaults to address 0 for self-conditional actions",
    constants.AddressZero,
    types.string
  )
  .addOptionalPositionalParam(
    "selectedprovider",
    "Defaults to network addressbook default"
  )
  .addOptionalPositionalParam(
    "selectedexecutor",
    "Defaults to network addressbook default"
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
    "Defaults to 0 for selectedexecutor's maximum",
    0,
    types.int
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async taskArgs => {
    try {
      // To avoid mistakes default log to true
      taskArgs.log = true;

      // Command Line Argument Checks
      if (
        taskArgs.conditionname != constants.AddressZero &&
        !taskArgs.conditionname.startsWith("Condition")
      ) {
        throw new Error(
          `Invalid condition: ${taskArgs.conditionname}: enter <actionname> <conditionname>`
        );
      }
      if (!taskArgs.actionname.startsWith("Action")) {
        throw new Error(
          `Invalid action: ${taskArgs.actionname}: enter <actionname> <conditionname>`
        );
      }

      // Selected Provider and Executor
      const selectedProvider = await run("handleProvider", {
        provider: taskArgs.selectedprovider
      });
      const selectedExecutor = await run("handleExecutor", {
        executor: taskArgs.selectedexecutor
      });

      // Condition and ConditionPayload (optional)
      let conditionAddress;
      let conditionPayload = constants.HashZero;
      if (taskArgs.conditionname != constants.AddressZero) {
        conditionAddress = await run("bre-config", {
          deployments: true,
          contractname: taskArgs.conditionname
        });
        conditionPayload = await run("handlePayload", {
          contractname: taskArgs.conditionname
        });
      }

      // Action and ActionPayload
      const actionAddress = await run("bre-config", {
        deployments: true,
        contractname: taskArgs.actionname
      });
      const actionPayload = await run("handlePayload", {
        contractname: taskArgs.actionname,
        payload: taskArgs.actionpayload
      });

      // GelatoCore write Instance
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true
      });

      // mintExecutionClaim TX
      const mintTx = await gelatoCore.mintExecutionClaim(
        [selectedProvider, selectedExecutor],
        [conditionAddress, actionAddress],
        conditionPayload,
        actionPayload,
        taskArgs.executionclaimexpirydate
      );

      if (taskArgs.log) {
        console.log(
          `\n\ntxHash gelatoCore.mintExecutionClaim: ${mintTx.hash}\n`
        );
      }

      // Wait for tx to get mined
      const { blockHash } = await mintTx.wait();

      // Event Emission verification
      if (taskArgs.log) {
        let parsedMintLog = await run("event-getparsedlogs", {
          contractname: "GelatoCore",
          eventname: "LogExecutionClaimMinted",
          txhash: mintTx.hash,
          blockHash,
          values: true
        });
        // Make execution claim Id human readable
        console.log("\nId: ", parsedMintLog.executionClaimId.toString());
        console.log("\nLogExecutionClaimMinted\n", parsedMintLog);
      }

      return mintTx.hash;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
