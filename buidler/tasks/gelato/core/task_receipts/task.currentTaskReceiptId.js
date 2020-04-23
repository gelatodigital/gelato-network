import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-currenttaskreceiptid",
  `Calls GelatoCore.currentTaskReceiptId() on [--network] (default: ${defaultNetwork})`
)
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ log }) => {
    try {
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        read: true
      });

      const currentTaskReceiptId = await gelatoCore.currentTaskReceiptId();
      if (log) {
        console.log(
          `\n GelatoCore current TaskReceiptId: ${currentTaskReceiptId}`
        );
      }
      return currentTaskReceiptId;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
