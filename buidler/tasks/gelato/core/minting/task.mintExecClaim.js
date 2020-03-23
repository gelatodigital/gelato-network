import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";
import { constants } from "ethers";

export default task(
  "gc-mint",
  `Sends tx to GelatoCore.mintExecClaim() on [--network] (default: ${defaultNetwork})`
)
  .addOptionalPositionalParam(
    "conditionname",
    "Must exist inside buidler.config. Supply '0' for AddressZero Conditions"
  )
  .addOptionalPositionalParam(
    "actionname",
    "Actionname (must be inside buidler.config) OR --actionaddress MUST be supplied."
  )
  .addOptionalPositionalParam(
    "gelatoprovider",
    "Defaults to network addressbook default"
  )
  .addOptionalPositionalParam(
    "gelatoexecutor",
    "Defaults to network addressbook default"
  )
  .addOptionalParam("conditionaddress", "", constants.AddressZero)
  .addOptionalParam("actionaddress")
  .addOptionalPositionalParam(
    "conditionpayload",
    "If not provided, must have a default returned from handleGelatoPayload()",
    constants.HashZero
  )
  .addOptionalPositionalParam(
    "actionpayload",
    "If not provided, must have a default returned from handleGelatoPayload()"
  )
  .addOptionalPositionalParam(
    "execclaimexpirydate",
    "Defaults to 0 for gelatoexecutor's maximum",
    constants.HashZero
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async taskArgs => {
    try {
      // Command Line Argument Checks
      if (!taskArgs.actionname && !taskArgs.actionaddress)
        throw new Error(`\n Must supply <actionname> or --actionaddress`);
      if (
        taskArgs.conditionname !== constants.AddressZero &&
        !taskArgs.conditionname.startsWith("Condition")
      ) {
        throw new Error(
          `\nInvalid condition: ${taskArgs.conditionname}: 1.<conditionname> 2.<actionname>\n`
        );
      }
      if (taskArgs.actionname && !taskArgs.actionname.startsWith("Action")) {
        throw new Error(
          `\nInvalid action: ${taskArgs.actionname}: 1.<conditionname> 2.<actionname>\n`
        );
      }

      // Selected Provider and Executor
      taskArgs.gelatoprovider = await run("handleGelatoProvider", {
        gelatoprovider: taskArgs.gelatoprovider
      });
      taskArgs.gelatoexecutor = await run("handleGelatoExecutor", {
        gelatoexecutor: taskArgs.gelatoexecutor
      });

      // Condition and ConditionPayload (optional)
      if (taskArgs.conditionname !== "0") {
        if (taskArgs.conditionaddress === constants.AddressZero) {
          taskArgs.conditionaddress = await run("bre-config", {
            deployments: true,
            contractname: taskArgs.conditionname
          });
        }
        if (!taskArgs.conditionpayload) {
          taskArgs.conditionpayload = await run("handleGelatoPayload", {
            contractname: taskArgs.conditionname
          });
        }
      }

      // Action and ActionPayload
      if (!taskArgs.actionaddress) {
        taskArgs.actionaddress = await run("bre-config", {
          deployments: true,
          contractname: taskArgs.actionname
        });
      }
      if (!taskArgs.actionpayload) {
        taskArgs.actionpayload = await run("handleGelatoPayload", {
          contractname: taskArgs.actionname,
          payload: taskArgs.actionpayload
        });
      }

      // GelatoCore write Instance
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true
      });

      // mintExecClaim TX
      const mintTx = await gelatoCore.mintExecClaim(
        [taskArgs.gelatoprovider, taskArgs.gelatoexecutor],
        [taskArgs.conditionaddress, taskArgs.actionaddress],
        taskArgs.conditionpayload,
        taskArgs.actionpayload,
        taskArgs.execclaimexpirydate
      );

      if (taskArgs.log) {
        console.log(
          `\n\ntxHash gelatoCore.mintExecClaim: ${mintTx.hash}\n`
        );
      }

      // Wait for tx to get mined
      const { blockHash } = await mintTx.wait();

      // Event Emission verification
      if (taskArgs.log) {
        const parsedMintingLog = await run("event-getparsedlog", {
          contractname: "GelatoCore",
          eventname: "LogExecClaimMinted",
          txhash: mintTx.hash,
          blockHash,
          values: true,
          stringify: true
        });
        if (parsedMintingLog)
          console.log("\n✅ LogExecClaimMinted\n", parsedMintingLog);
        else console.log("\n❌ LogExecClaimMinted not found");
      }

      return mintTx.hash;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
