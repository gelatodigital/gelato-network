import { task, types } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../buidler.config";

export default task(
  "event-getlog",
  `Return (or --log) the provider's Log for <contractname> <eventname> <txhash> --fromBlock --toBlock or --blockHash  [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam(
    "contractname",
    "Must be in config.networks.[--network].contracts"
  )
  .addPositionalParam(
    "eventname",
    "The name of the event in the <contractname>'s abi"
  )
  .addPositionalParam("txhash", "The tx from which to get the Log")
  .addOptionalPositionalParam(
    "contractaddress",
    "An address of a deployed instance of <contractname>. Defaults to network.deployments.<contractname>"
  )
  .addOptionalParam(
    "fromblock",
    "The block number to search for event logs from",
    undefined, // placeholder default ...
    types.number // ... only to enforce type
  )
  .addOptionalParam(
    "toblock",
    "The block number up until which to look for",
    undefined, // placeholder default ...
    types.number // ... only to enforce type
  )
  .addOptionalParam("blockhash", "Search a specific block")
  .addFlag("log", "Logs return values to stdout")
  .setAction(
    async ({
      contractname,
      eventname,
      txhash,
      contractaddress,
      blockhash,
      fromblock,
      toblock,
      log
    }) => {
      try {
        if (!contractaddress) {
          contractaddress = await run("bre-config", {
            deployments: true,
            contractname
          });
        }
        const contractInterface = await run("ethers-interface-new", {
          contractname
        });

        if (!contractInterface.events[eventname]) {
          throw new Error(
            `\n Eventname "${eventname}" does not exist on ${contractname}`
          );
        }

        if (fromblock && toblock)
          if (fromblock > toblock) throw new Error("\n fromblock > toblock");

        if ((fromblock || toblock) && blockhash)
          throw new Error("\n Cannot specify blocknums alongside blockHash");

        if (!blockhash) {
          const {
            filters: { defaultFromBlock, defaultToBlock }
          } = await run("bre-network", { c: true });
          if (!fromblock) fromblock = defaultFromBlock;
          if (!toblock) toblock = defaultToBlock;
        }

        const filter = {
          address: contractaddress,
          blockHash: blockhash,
          fromBlock: fromblock,
          toBlock: toblock,
          topics: [contractInterface.events[eventname].topic]
        };

        const filteredLogs = await ethers.provider.getLogs(filter);
        const logWithTxHash = filteredLogs.find(
          log => log.transactionHash == txhash
        );

        if (log) {
          console.log(
            `\nLog for ${contractname}.${eventname} from block ${
              fromblock ? fromblock : blockhash
            } to block ${toblock} with tx-Hash ${txhash}:`
          );
          console.log(logWithTxHash ? logWithTxHash : "❌ Not found");
        }
        if (!logWithTxHash) {
          throw new Error(
            `\n event-getlog: ${contractname}.${eventname} not found.`
          );
        }

        return logWithTxHash;
      } catch (error) {
        console.error(error, "\n");
      }
    }
  );
