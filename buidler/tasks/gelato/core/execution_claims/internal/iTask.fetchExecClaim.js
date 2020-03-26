import { task } from "@nomiclabs/buidler/config";

export default task(
  "fetchExecClaim",
  `Returns the <execClaim> and if not present fetches its values from networks logs`
)
  .addPositionalParam("execclaimid")
  .addOptionalParam("fromblock", "Search for event logs from block number")
  .addOptionalParam("toblock", "The block number up until which to look for")
  .addOptionalParam("blockhash", "Search a specific block")
  .addOptionalParam("txhash", "Filter for a specific tx")
  .addFlag("stringify")
  .addFlag("log", "Logs return values to stdout")
  .setAction(
    async ({
      execclaimid,
      fromblock,
      toblock,
      blockhash,
      txhash,
      stringify,
      log
    }) => {
      try {
        let execClaim;
        if (txhash) {
          // Search Log with txhash
          execClaim = await run("event-getparsedlog", {
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
          execClaim = await run("event-getparsedlogs", {
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
          if (!execClaim) {
            throw new Error(`\n ❌ ExecClaim ${execclaimid} not found`);
          }
          if (!execClaim.length == 1) {
            throw new Error(`\n ❌ ExecClaim ${execclaimid} not unique`);
          }
          [execClaim] = execClaim;
        }

        if (!execClaim)
          throw new Error(`\n ❌ ExecClaim ${execclaimid} not found`);
        if (log) console.log(`\n ExecClaim:\n`, execClaim);
        return execClaim;
      } catch (error) {
        console.error(error, "\n");
        process.exit(1);
      }
    }
  );
