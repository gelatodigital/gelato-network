import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask(
  "handleProvider",
  "Returns default provider from network addresbook, if no provider is passed"
)
  .addOptionalParam("selectedprovider")
  .setAction(async ({ selectedprovider }) => {
    try {
      if (selectedprovider) return selectedprovider;
      selectedprovider = await run("bre-config", {
        addressbookcategory: "executor",
        addressbookentry: "default"
      });
      return selectedprovider;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
