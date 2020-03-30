import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../../buidler.config";

export default task(
  "gc-oraclesuccessfeefactor",
  `Return (or --log) GelatoCore.gasAdminSuccessShare() on [--network] (default: ${defaultNetwork})`
)
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ log }) => {
    try {
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true
      });
      const gasAdminSuccessShare = await gelatoCore.gasAdminSuccessShare();
      if (log) {
        console.log(`
          \n OracleSuccessFeeFactor: ${gasAdminSuccessShare}\
          \n Network:                ${network.name}\n
        `);
      }
      return gasAdminSuccessShare;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
