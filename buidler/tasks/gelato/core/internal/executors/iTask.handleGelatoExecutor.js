import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask(
  "handleGelatoExecutor",
  "Returns default gelatoexecutor, if no gelatoexecutor is passed"
)
  .addOptionalParam("gelatoexecutor")
  .setAction(async ({ gelatoexecutor }) => {
    try {
      if (gelatoexecutor) return gelatoexecutor;
      gelatoexecutor = await run("bre-config", {
        addressbookcategory: "gelatoExecutor",
        addressbookentry: "default"
      });
      return gelatoexecutor;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
