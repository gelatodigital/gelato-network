import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";
import { constants } from "ethers";

export default task(
  "gc-mint",
  `Sends tx to GelatoCore.mintExecutionClaim() on [--network] (default: ${defaultNetwork})`
)
  .addOptionalPositionalParam(
    "conditionname",
    "Must exist inside buidler.config. Defaults to address 0 for self-conditional actions",
    constants.AddressZero,
    types.string
  )
  .addOptionalPositionalParam(
    "actionname",
    "This param MUST be supplied. Must exist inside buidler.config"
  )
  .addOptionalPositionalParam(
    "gelatoprovider",
    "Defaults to network addressbook default"
  )
  .addOptionalPositionalParam(
    "gelatoexecutor",
    "Defaults to network addressbook default"
  )
  .addOptionalPositionalParam(
    "conditionpayload",
    "If not provided, must have a default returned from handleGelatoPayload()"
  )
  .addOptionalPositionalParam(
    "actionpayload",
    "If not provided, must have a default returned from handleGelatoPayload()"
  )
  .addOptionalPositionalParam(
    "executionclaimexpirydate",
    "Defaults to 0 for gelatoexecutor's maximum",
    0,
    types.int
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async taskArgs => {
    try {
      // Command Line Argument Checks
      if (!taskArgs.actionname) throw new Error(`\n Must supply Action Name`);
      if (
        taskArgs.conditionname != constants.AddressZero &&
        !taskArgs.conditionname.startsWith("Condition")
      ) {
        throw new Error(
          `\nInvalid condition: ${taskArgs.conditionname}: 1.<conditionname> 2.<actionname>\n`
        );
      }
      if (!taskArgs.actionname.startsWith("Action")) {
        throw new Error(
          `\nInvalid action: ${taskArgs.actionname}: 1.<conditionname> 2.<actionname>\n`
        );
      }

      // Selected Provider and Executor
      const gelatoProvider = await run("handleGelatoProvider", {
        provider: taskArgs.gelatoprovider
      });
      const gelatoExecutor = await run("handleGelatoExecutor", {
        executor: taskArgs.gelatoexecutor
      });

      // Condition and ConditionPayload (optional)
      let conditionAddress;
      let conditionPayload = constants.HashZero;
      if (taskArgs.conditionname != constants.AddressZero) {
        conditionAddress = await run("bre-config", {
          deployments: true,
          contractname: taskArgs.conditionname
        });
        conditionPayload = await run("handleGelatoPayload", {
          contractname: taskArgs.conditionname
        });
      }

      // Action and ActionPayload
      const actionAddress = await run("bre-config", {
        deployments: true,
        contractname: taskArgs.actionname
      });
      const actionPayload = await run("handleGelatoPayload", {
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
        [gelatoProvider, gelatoExecutor],
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
        const parsedMintingLog = await run("event-getparsedlog", {
          contractname: "GelatoCore",
          eventname: "LogExecutionClaimMinted",
          txhash: mintTx.hash,
          blockHash,
          values: true,
          stringify: true
        });
        if (parsedMintingLog)
          console.log("\n✅ LogExecutionClaimMinted\n", parsedMintingLog);
        else console.log("\n❌ LogExecutionClaimMinted not found");
      }

      return mintTx.hash;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
