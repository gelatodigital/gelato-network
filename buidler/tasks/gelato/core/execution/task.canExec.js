import { task, types } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-canexec",
  `Calls GelatoCore.canExec() on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("execclaimid")
  .addOptionalPositionalParam(
    "executorindex",
    "which mnemonic index should be selected for executor msg.sender (default index 1)",
    1,
    types.int
  )
  .addOptionalParam(
    "execclaim",
    "Supply LogExecClaimMinted values in an obj"
  )
  .addOptionalParam(
    "fromblock",
    "The block number to search for event logs from",
    undefined, // default
    types.number
  )
  .addOptionalParam(
    "toblock",
    "The block number up until which to look for",
    undefined, // default
    types.number
  )
  .addOptionalParam("blockhash", "Search a specific block")
  .addOptionalParam("txhash", "Filter for a specific tx")
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
      log
    }) => {
      try {
        if (!execclaim) {
          execclaim = await run("fetchExecClaim", {
            execclaimid,
            execclaim,
            fromblock,
            toblock,
            blockhash,
            txhash,
            log
          });
        }

        if (!execclaim)
          throw new Error("Unable to fetch execClaim from events");

        const { [executorindex]: executor } = await ethers.signers();

        if (log) console.log(`\n Executor: ${executor._address}\n`);

        const gelatoCore = await run("instantiateContract", {
          contractname: "GelatoCore",
          signer: executor,
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
        console.error(error);
        process.exit(1);
      }
    }
  );
