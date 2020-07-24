import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-totalSuccessShare",
  `Return (or --log) GelatoCore.totalSuccessShare() on [--network] (default: ${defaultNetwork})`
)
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ log }) => {
    try {
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true,
      });
      const totalSuccessShare = await gelatoCore.totalSuccessShare();
      if (log) {
        console.log(`
          \n totalSuccessShare:      ${totalSuccessShare}\
          \n Network:                ${network.name}\n
        `);
      }
      return totalSuccessShare;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
