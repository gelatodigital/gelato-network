import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-gelatoGasPriceOracle",
  `Return (or --log) GelatoCore.gelatoGasPriceOracle() on [--network] (default: ${defaultNetwork})`
)
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ log }) => {
    try {
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true,
      });
      const gelatoGasPriceOracle = await gelatoCore.gelatoGasPriceOracle();
      if (log) {
        console.log(`
          \n gelatoGasPriceOracle:  ${gelatoGasPriceOracle}\
          \n Network:               ${network.name}\n
        `);
      }
      return gelatoGasPriceOracle;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
