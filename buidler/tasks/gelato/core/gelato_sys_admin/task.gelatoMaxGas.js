import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-gelatoMaxGas",
  `Return (or --log) GelatoCore.gelatoMaxGas() on [--network] (default: ${defaultNetwork})`
)
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ log }) => {
    try {
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true,
      });
      const gelatoMaxGas = await gelatoCore.gelatoMaxGas();
      if (log) {
        console.log(`
          \n gelatoMaxGas:          ${gelatoMaxGas}\
          \n Network:               ${network.name}\n
        `);
      }
      return gelatoMaxGas;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
