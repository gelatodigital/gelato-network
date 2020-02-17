import { task, types } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../buidler.config";

export default task(
  "event-getlogs",
  `Return (or --log) the provider's logs for <contractname> <eventname> --fromBlock --toBlock or --blockHash  [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam(
    "contractname",
    "Must be in config.networks.[--network].contracts"
  )
  .addPositionalParam(
    "eventname",
    "The name of the event in the <contractname>'s abi"
  )
  .addOptionalPositionalParam(
    "contractaddress",
    "An address of a deployed instance of <contractname>. Defaults to network.deployments.<contractname>"
  )
  .addOptionalParam(
    "fromblock",
    "the block number to search for event logs from",
    undefined, // default
    types.number
  )
  .addOptionalParam(
    "toblock",
    "the block number up until which to look for",
    undefined, // default
    types.number
  )
  .addOptionalParam("blockhash", "the blockhash in which")
  .addOptionalParam("txhash", "filter for a specific tx")
  .addFlag("log", "Logs return values to stdout")
  .setAction(
    async ({
      contractname,
      eventname,
      contractaddress,
      blockhash,
      fromblock,
      toblock,
      txhash,
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

        if (fromblock && toblock)
          if (fromblock > toblock) throw new Error("fromblock > toblock");

        if ((fromblock || toblock) && blockhash)
          throw new Error("cannot specify blocknums alongside blockHash");

        const {
          filters: { defaultFromBlock, defaultToBlock }
        } = await run("bre-network", { c: true });

        if (!fromblock && !blockhash) fromblock = defaultFromBlock;
        if (!toblock && !blockhash) toblock = defaultToBlock;

        const filter = {
          address: contractaddress,
          blockHash: blockhash,
          fromBlock: fromblock,
          toBlock: toblock,
          topics: [contractInterface.events[eventname].topic]
        };

        const logs = await ethers.provider.getLogs(filter);

        let logWithTxHash;
        if (txhash)
          [logWithTxHash] = logs.filter(log => log.transactionHash == txhash);

        if (log) {
          if (!logs.length) {
            console.log(
              `No logs for ${contractname}.${eventname} from block ${
                fromblock ? fromblock : blockhash
              } ${toblock ? `to block ${toblock}` : "to latest block"}`
            );
          } else {
            if (!txhash) {
              console.log(
                `Logs for ${contractname}.${eventname} from block ${
                  fromblock ? fromblock : blockhash
                } to block ${toblock}`
              );
              for (const aLog of logs) console.log("\n", aLog);
            } else {
              console.log(
                `Log for ${contractname}.${eventname} from block ${
                  fromblock ? fromblock : blockhash
                } to block ${toblock} with tx-Hash ${txhash}`
              );
              if (!logWithTxHash) console.log(`No log for tx-Hash: ${txhash}`);
              else console.log(logWithTxHash);
            }
          }
        }
        if (txhash) return logWithTxHash ? logWithTxHash : undefined;
        else return logs.length ? logs : undefined;
      } catch (error) {
        console.error(error);
        process.exit(1);
      }
    }
  );
