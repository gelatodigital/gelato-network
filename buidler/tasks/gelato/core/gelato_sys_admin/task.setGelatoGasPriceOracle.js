import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-setgelatogaspriceoracle",
  `Sends tx to GelatoCore.setGelatoGasPriceOracle(<address>) on [--network] (default: ${defaultNetwork})`
)
  .addOptionalPositionalParam(
    "oracle",
    "The GelatoGasPriceOracle contract address"
  )
  .addOptionalParam("gelatocoreaddress", "Provide this if not in bre-config")
  .addFlag("log", "Logs return values to stdout")
  .addFlag("events", "Logs parsed Event Logs to stdout")
  .setAction(async (taskArgs) => {
    try {
      if (taskArgs.log)
        console.log("\n gc-setgelatogaspriceoracle: TaskArgs\n", taskArgs);

      const sysAdmin = getSysAdmin();

      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        contractaddress: taskArgs.gelatocoreaddress,
        write: true,
        signer: sysAdmin,
      });

      const tx = await gelatoCore.setGelatoGasPriceOracle(taskArgs.oracle);
      if (taskArgs.log)
        console.log(`\n\ntxHash setGelatoGasPriceOracle: ${tx.hash}`);
      const { blockHash: blockhash } = await tx.wait();

      if (taskArgs.events) {
        await run("event-getparsedlogsallevents", {
          contractname: "GelatoCore",
          contractaddress: gelatoCore.address,
          blockhash,
          txhash: tx.hash,
          log: true,
        });
      }

      return tx.hash;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
