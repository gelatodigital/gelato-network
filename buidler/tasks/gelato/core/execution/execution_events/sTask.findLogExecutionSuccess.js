import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../../buidler.config";

export default task(
  "findLogExecutionSuccess",
  `Queries the --network (default: ${defaultNetwork}) [--fromblock] for LogExecutionSuccess
   values for <executionclaimid>. Returns undefined if none were found.`
)
  .addPositionalParam("executionclaimid")
  .addOptionalPositionalParam(
    "fromblock",
    "the block from which to search for executionclaimid data"
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ executionclaimid, fromblock, log }) => {
    try {
      // Fetch current gelatoCore
      const successfulExecutions = await run("event-getparsedlogs", {
        contractname: "GelatoCore",
        eventname: "LogExecutionClaimMinted",
        fromblock,
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
  });
