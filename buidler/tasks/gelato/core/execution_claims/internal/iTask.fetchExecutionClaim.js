import { task, types } from "@nomiclabs/buidler/config";

export default task(
  "fetchExecutionClaim",
  `Returns the <executionClaim> and if not present fetches its values from networks logs`
)
  .addParam("executionclaim", "Supply LogExecutionClaimMinted values in an obj")
  .addParam("executionclaimid")
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
  .addFlag("stringify")
  .addFlag("log", "Logs return values to stdout")
  .setAction(
    async ({
      executionclaim,
      executionclaimid,
      fromblock,
      toblock,
      blockhash,
      txhash,
      stringify,
      log
    }) => {
      try {
        if (!executionclaim) {
          if (txhash) {
            // Search Log with txhash
            executionclaim = await run("event-getparsedlog", {
              executionclaimid,
              contractname: "GelatoCore",
              eventname: "LogExecutionClaimMinted",
              txhash,
              fromblock,
              toblock,
              blockhash,
              values: true,
              filterkey: "executionClaimId",
              filtervalue: executionclaimid,
              stringify
            });
          } else {
            // Search Logs
            executionclaim = await run("event-getparsedlogs", {
              executionclaimid,
              contractname: "GelatoCore",
              eventname: "LogExecutionClaimMinted",
              fromblock,
              toblock,
              blockhash,
              values: true,
              filterkey: "executionClaimId",
              filtervalue: executionclaimid,
              stringify
            });
          }
          if (!executionclaim) {
            throw new Error(
              `\n ❌ ExecutionClaim ${executionclaimid} not found`
            );
          }
          if (!executionclaim.length == 1) {
            throw new Error(
              `\n ❌ ExecutionClaim ${executionclaimid} not unique`
            );
          }
          [executionclaim] = executionclaim;
        }
        if (!executionclaim)
          throw new Error(`\n ❌ ExecutionClaim ${executionclaimid} not found`);
        if (log) console.log(`\n ExecutionClaim:\n`, executionclaim);
        return executionclaim;
      } catch (error) {
        console.error(error);
        process.exit(1);
      }
    }
  );
