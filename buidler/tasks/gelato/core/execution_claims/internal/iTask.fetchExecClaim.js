import { task, types } from "@nomiclabs/buidler/config";

export default task(
  "fetchExecClaim",
  `Returns the <execClaim> and if not present fetches its values from networks logs`
)
  .addParam("execclaim", "Supply LogExecClaimMinted values in an obj")
  .addParam("execclaimid")
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
      execclaim,
      execclaimid,
      fromblock,
      toblock,
      blockhash,
      txhash,
      stringify,
      log
    }) => {
      try {
        if (!execclaim) {
          if (txhash) {
            // Search Log with txhash
            execclaim = await run("event-getparsedlog", {
              execclaimid,
              contractname: "GelatoCore",
              eventname: "LogExecClaimMinted",
              txhash,
              fromblock,
              toblock,
              blockhash,
              values: true,
              filterkey: "execClaimId",
              filtervalue: execclaimid,
              stringify
            });
          } else {
            // Search Logs
            execclaim = await run("event-getparsedlogs", {
              execclaimid,
              contractname: "GelatoCore",
              eventname: "LogExecClaimMinted",
              fromblock,
              toblock,
              blockhash,
              values: true,
              filterkey: "execClaimId",
              filtervalue: execclaimid,
              stringify
            });
          }
          if (!execclaim) {
            throw new Error(
              `\n ❌ ExecClaim ${execclaimid} not found`
            );
          }
          if (!execclaim.length == 1) {
            throw new Error(
              `\n ❌ ExecClaim ${execclaimid} not unique`
            );
          }
          [execclaim] = execclaim;
        }
        if (!execclaim)
          throw new Error(`\n ❌ ExecClaim ${execclaimid} not found`);
        if (log) console.log(`\n ExecClaim:\n`, execclaim);
        return execclaim;
      } catch (error) {
        console.error(error);
        process.exit(1);
      }
    }
  );
