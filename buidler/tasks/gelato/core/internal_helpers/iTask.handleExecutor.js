import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask(
  "handleExecutor",
  "Returns default executor, if no executor is passed"
)
  .addOptionalParam("selectedexecutor")
  .setAction(async ({ selectedexecutor }) => {
    try {
      if (selectedexecutor) return selectedexecutor;
      selectedexecutor = await run("bre-config", {
        addressbookcategory: "executor",
        addressbookentry: "default"
      });
      return selectedexecutor;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
