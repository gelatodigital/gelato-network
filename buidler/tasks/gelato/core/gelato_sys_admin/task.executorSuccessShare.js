import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-executorSuccessShare",
  `Return (or --log) GelatoCore.executorSuccessShare() on [--network] (default: ${defaultNetwork})`
)
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ log }) => {
    try {
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true,
      });
      const executorSuccessShare = await gelatoCore.executorSuccessShare();
      if (log) {
        console.log(`
          \n executorSuccessShare:   ${executorSuccessShare}\
          \n Network:                ${network.name}\n
        `);
      }
      return executorSuccessShare;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
