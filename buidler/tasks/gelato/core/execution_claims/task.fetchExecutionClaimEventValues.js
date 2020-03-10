import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../../buidler.config";

export default task(
  "fetchexecutionclaimeventvalues",
  `Queries the --network (default: ${defaultNetwork}) [--fromblock] for <eventname>
   values for <executionclaimid>. Returns undefined if none were found.`
)
  .addPositionalParam("executionclaimid")
  .addPositionalParam("contractname")
  .addPositionalParam("eventname")
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
  .addFlag("values", "Only get the values of the parsed Event Log")
  .addFlag("log", "Logs return values to stdout")
  .setAction(
    async ({
      executionclaimid,
      contractname,
      eventname,
      fromblock,
      toblock,
      blockhash,
      txhash,
      log
    }) => {
      try {
        // Fetch current gelatoCore
        const executionClaimEventValues = await run("event-getparsedlogs", {
          contractname,
          eventname,
          fromblock,
          toblock,
          blockhash,
          txhash,
          values
        });

        const executionClaimEvent = executionClaimEventValues.find(event =>
          ethers.utils.bigNumberify(executionclaimid).eq(event.executionClaimId)
        );

        if (executionClaimEvent) {
          if (log) {
            console.log(
              `\n ExecutionClaimId: ${executionclaimid}\
               \n Event:            ${eventname}:\n Values:\n`,
              executionClaimEvent
            );
          }
          return executionClaimEvent;
        } else {
          if (log) {
            console.log(
              `\n ❌ ExecutionClaim Event "${eventname}" not found for ExecutionClaim-${executionclaimid}\n`
            );
          }
        }
      } catch (error) {
        console.error(error);
        process.exit(1);
      }
    }
  );
