import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "ggpo-setoracle",
  `Sends tx to GelatoGasPriceOracle.setOracle(<address>) on [--network] (default: ${defaultNetwork})`
)
  .addOptionalPositionalParam("oracle", "The oracle address")
  .addOptionalParam("contractaddress", "Provide this if not in bre-config")
  .addFlag("log", "Logs return values to stdout")
  .addFlag("events", "Logs parsed Event Logs to stdout")
  .setAction(async (taskArgs) => {
    try {
      if (taskArgs.log)
        console.log("\n gc-setgelatogaspriceoracle: TaskArgs\n", taskArgs);

      const gelatoGasPriceOracle = await run("instantiateContract", {
        contractname: "GelatoGasPriceOracle",
        contractaddress: taskArgs.contractaddress,
        write: true,
      });

      const tx = await gelatoGasPriceOracle.setOracle(taskArgs.oracle);
      if (taskArgs.log) console.log(`\n\ntxHash setOracle: ${tx.hash}`);
      const { blockHash: blockhash } = await tx.wait();

      if (taskArgs.events) {
        await run("event-getparsedlogsallevents", {
          contractname: "GelatoGasPriceOracle",
          contractaddress: gelatoGasPriceOracle.address,
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
