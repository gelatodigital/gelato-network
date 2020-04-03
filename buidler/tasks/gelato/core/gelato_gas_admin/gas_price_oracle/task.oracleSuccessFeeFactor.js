import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../../buidler.config";

export default task(
  "gc-oraclesuccessfeefactor",
  `Return (or --log) GelatoCore.sysAdminSuccessShare() on [--network] (default: ${defaultNetwork})`
)
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ log }) => {
    try {
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true
      });
      const sysAdminSuccessShare = await gelatoCore.sysAdminSuccessShare();
      if (log) {
        console.log(`
          \n OracleSuccessFeeFactor: ${sysAdminSuccessShare}\
          \n Network:                ${network.name}\n
        `);
      }
      return sysAdminSuccessShare;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
