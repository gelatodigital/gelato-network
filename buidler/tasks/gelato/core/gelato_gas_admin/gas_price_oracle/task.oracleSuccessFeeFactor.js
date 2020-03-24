import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../../buidler.config";

export default task(
  "gc-oraclesuccessfeefactor",
  `Return (or --log) GelatoCore.oracleSuccessFeeFactor() on [--network] (default: ${defaultNetwork})`
)
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ log }) => {
    try {
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true
      });
      const oracleSuccessFeeFactor = await gelatoCore.oracleSuccessFeeFactor();
      if (log) {
        console.log(`
          \n OracleSuccessFeeFactor: ${oracleSuccessFeeFactor}\
          \n Network:                ${network.name}\n
        `);
      }
      return oracleSuccessFeeFactor;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
