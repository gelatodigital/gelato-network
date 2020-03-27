import { task } from "@nomiclabs/buidler/config";

export default task(
  "fetchExecClaim",
  `Returns the <execClaim> and if not present fetches its values from networks logs`
)
  .addPositionalParam("execclaimid")
  .addFlag("execclaimhash", "Als return the execClaimHash")
  .addOptionalParam("fromblock", "Search for event logs from block number")
  .addOptionalParam("toblock", "The block number up until which to look for")
  .addOptionalParam("blockhash", "Search a specific block")
  .addOptionalParam("txhash", "Filter for a specific tx")
  .addFlag("stringify")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async taskArgs => {
    try {
      if (taskArgs.log) console.log("\n fetchExecClaim:\n", taskArgs);

      let execClaim;
      if (taskArgs.txhash) {
        // Search Log with txhash
        execClaim = await run("event-getparsedlog", {
          contractname: "GelatoCore",
          eventname: "LogExecClaimMinted",
          txhash: taskArgs.txhash,
          fromblock: taskArgs.fromblock,
          toblock: taskArgs.toblock,
          blockhash: taskArgs.blockhash,
          property: "execClaim",
          stringify: taskArgs.stringify
        });
      } else {
        // Search Logs
        const execClaims = await run("event-getparsedlogs", {
          contractname: "GelatoCore",
          eventname: "LogExecClaimMinted",
          fromblock: taskArgs.fromblock,
          toblock: taskArgs.toblock,
          blockhash: taskArgs.blockhash,
          property: "execClaim",
          stringify: taskArgs.stringify
        });
        if (!execClaims) throw new Error(`\n ❌ ExecClaim not found in logs`);

        // This will only work with new ethers update that uses annotated arrays for structs
        /*execClaim = execClaims.filter(
          exeClaim => execClaim.id == taskArgs.execclaimid
        );*/
      }

      if (!execClaim) throw new Error(`\n ❌ No ExecClaim logs where found`);
      /*if (!execClaim.id.toString() == taskArgs.execclaimid.toString()) {
        throw new Error(
          `\n No ExecClaim with id ${taskArgs.execclaimid} was found`
        );
      }*/

      if (taskArgs.log) console.log(`\n ExecClaim:\n`, execClaim);

      return execClaim;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
