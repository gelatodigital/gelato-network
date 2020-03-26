import { task, types } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-canexec",
  `Calls GelatoCore.canExec() on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("execclaimid")
  .addOptionalPositionalParam(
    "executorindex",
    "Mnenomic generated account to sign the tx",
    1,
    types.int
  )
  .addOptionalParam("execclaim", "Supply LogExecClaimMinted values in an obj")
  .addOptionalParam("fromblock", "Search for event logs from block number.")
  .addOptionalParam("toblock", "Search for event logs to block number.")
  .addOptionalParam("blockhash", "Search a specific block")
  .addOptionalParam("txhash", "Filter for a specific tx")
  .addFlag("stringify")
  .addFlag("log", "Logs return values to stdout")
  .setAction(
    async ({
      execclaimid,
      executorindex,
      execclaim,
      fromblock,
      toblock,
      blockhash,
      txhash,
      stringify,
      log
    }) => {
      try {
        if (!execclaim) {
          execclaim = await run("fetchExecClaim", {
            execclaimid,
            fromblock,
            toblock,
            blockhash,
            txhash,
            stringify,
            log
          });
        }

        if (!execclaim)
          throw new Error("\nUnable to fetch execClaim from events");

        const { [executorindex]: gelatoExecutor } = await ethers.signers();

        if (log) console.log(`\n Executor: ${gelatoExecutor._address}\n`);

        const gelatoCore = await run("instantiateContract", {
          contractname: "GelatoCore",
          signer: gelatoExecutor,
          write: true
        });

        try {
          const canExecResult = await gelatoCore.canExec(
            execclaim.gelatoProviderAndExecutor,
            execclaim.execClaimId,
            execclaim.userProxy,
            execclaim.conditionAndAction,
            execclaim.conditionPayload,
            execclaim.actionPayload,
            execclaim.execClaimExpiryDate
          );
          if (log) console.log(`\n Can Exec Result: ${canExecResult}\n`);
          return canExecResult;
        } catch (error) {
          console.error(`\n canExec error`, error);
        }
      } catch (error) {
        console.error(error, "\n");
        process.exit(1);
      }
    }
  );
