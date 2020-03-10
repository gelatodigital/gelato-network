import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask(
  "handleProvider",
  "Returns default provider from network addresbook, if no provider is passed"
)
  .addOptionalParam("provider")
  .setAction(async ({ provider }) => {
    try {
      if (provider) return provider;
      provider = await run("bre-config", {
        addressbookcategory: "provider",
        addressbookentry: "default"
      });
      return provider;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
