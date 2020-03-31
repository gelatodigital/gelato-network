import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../../buidler.config";
import { utils } from "ethers";

export default task(
  "gc-gelatogasprice",
  `Return (or --log) GelatoCore.gelatoGasPrice() on [--network] (default: ${defaultNetwork})`
)
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ log }) => {
    try {
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true
      });
      const gelatoGasPrice = await gelatoCore.gelatoGasPrice();
      const gelatoGasPriceGwei = utils.formatUnits(gelatoGasPrice, "gwei");
      if (log) {
        console.log(`
          \n GelatoGasPrice:        ${gelatoGasPrice}\
          \n GealtoGasPriceGwei:    ${gelatoGasPriceGwei} gwei\
          \n Network:               ${network.name}\n
        `);
      }
      return gelatoGasPrice;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
