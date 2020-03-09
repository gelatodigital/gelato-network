import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-fetchexecutionclaim",
  `Queries the --network (default: ${defaultNetwork}) [--fromblock] for LogExecutionClaimMinted
   values for <executionclaimid>. Returns undefined if none were found.`
)
  .addPositionalParam("executionclaimid")
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
      executionclaimid,
      fromblock,
      toblock,
      blockhash,
      txhash,
      log
    }) => {
      try {
        // Fetch current gelatoCore
        const mintedExecutionClaims = await run("event-getparsedlogs", {
          contractname: "GelatoCore",
          eventname: "LogExecutionClaimMinted",
          fromblock,
          toblock,
          blockhash,
          txhash,
          values: true
        });

        const executionClaim = mintedExecutionClaims.find(mintedClaim =>
          ethers.utils
            .bigNumberify(executionclaimid)
            .eq(mintedClaim.executionClaimId)
        );

        if (executionClaim) {
          if (log) {
            console.log(
              `\n Execution Claim ID-${executionclaimid}:\n`,
              executionClaim
            );
          }
          return executionClaim;
        } else {
          if (log) {
            console.log(
              `\n ❌ No Execution Claim with Id ${executionclaimid} found\n`
            );
          }
        }
      } catch (error) {
        console.error(error);
        process.exit(1);
      }
    }
  );
