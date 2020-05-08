import { task, types } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../buidler.config";

export default task(
  "event-getparsedlogsallevents",
  `Return (or --log) the provider's parsed eventlogs for all events on <contractname> for --txhash --fromBlock --toBlock or --blockHash  [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam(
    "contractname",
    "Must be in config.networks.[--network].contracts"
  )
  .addOptionalPositionalParam(
    "contractaddress",
    "An address of a deployed instance of <contractname>. Defaults to network.deployments.<contractname>"
  )
  .addOptionalParam("txhash", "The tx from which to get the Log")
  .addOptionalParam(
    "fromblock",
    "The block number to search for event eventlogs from",
    undefined, // placeholder default ...
    types.int // ... only to enforce type
  )
  .addOptionalParam(
    "toblock",
    "The block number up until which to look for",
    undefined, // placeholder default ...
    types.int // ... only to enforce type
  )
  .addOptionalParam("blockhash", "Search a specific block")
  .addOptionalParam("property", "A specific key-value pair to search for")
  .addOptionalParam("filterkey", "A key to filter for")
  .addOptionalParam("filtervalue", "A value to filter for")
  .addFlag("strcmp", "Filters based on string comparison")
  .addFlag("values", "Only return the values property of the parsedLog")
  .addFlag("stringify")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async (taskArgs) => {
    try {
      if (taskArgs.property && taskArgs.values)
        throw new Error("\nCannot search for --property and --values");
      if (taskArgs.filtervalue && !taskArgs.filterkey && !taskArgs.property)
        throw new Error("\n--filtervalue with a --filterkey or --property");
      if (taskArgs.filterkey && !taskArgs.values)
        throw new Error("\n--filter-key/value with --values");
      if (
        taskArgs.stringify &&
        !taskArgs.values &&
        !taskArgs.filtervalue &&
        !taskArgs.property
      )
        throw new Error("\n--stringify --values [--filtervalue] or --property");

      let loggingActivated;
      if (taskArgs.log) {
        loggingActivated = true;
        taskArgs.log = false;
      }

      const eventlogs = await run("event-getlogsallevents", taskArgs);

      if (!eventlogs) {
        throw new Error(
          `\n event-getparsedlogsallevents: ${taskArgs.contractname} no events found \n`
        );
      }

      taskArgs.eventlogs = eventlogs;

      const parsedLogs = await run("event-getparsedlogs", taskArgs);

      if (!parsedLogs.length) {
        throw new Error(
          `\n event-getparsedlogsallevents: ${taskArgs.contractname} no events found \n`
        );
      }

      if (loggingActivated) taskArgs.log = true;

      if (taskArgs.log) {
        if (!parsedLogs.length) {
          console.log(
            `\n❌  No parsed eventsLogs for ${
              taskArgs.contractname
            } from block ${
              taskArgs.fromblock ? taskArgs.fromblock : taskArgs.blockhash
            } ${taskArgs.blockhash ? "." : `to block ${taskArgs.toblock}`}`
          );
        } else {
          console.log(
            `\n ✅ Parsed Events Logs for ${taskArgs.contractname} from block ${
              taskArgs.fromblock ? taskArgs.fromblock : taskArgs.blockhash
            } ${taskArgs.blockhash ? "" : `to block ${taskArgs.toblock}`}`
          );
          for (const parsedLog of parsedLogs) console.log("\n", parsedLog);
        }
      }

      return parsedLogs;
    } catch (error) {
      console.error(error, "\n");
    }
  });
