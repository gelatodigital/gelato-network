import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-oracleRequestData",
  `Return (or --log) GelatoCore.oracleRequestData() on [--network] (default: ${defaultNetwork})`
)
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ log }) => {
    try {
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true,
      });
      const oracleRequestData = await gelatoCore.oracleRequestData();
      if (log) {
        console.log(`
          \n oracleRequestData:     ${oracleRequestData}\
          \n Network:               ${network.name}\n
        `);
      }
      return oracleRequestData;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
