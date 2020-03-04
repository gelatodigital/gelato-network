import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask(
  "handleExecutor",
  "Returns default executor, if no executor is passed"
)
  .addOptionalParam("executor")
  .setAction(async ({ executor }) => {
    try {
      if (executor) return executor;
      executor = await run("bre-config", {
        addressbookcategory: "executor",
        addressbookentry: "default"
      });
      return executor;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
