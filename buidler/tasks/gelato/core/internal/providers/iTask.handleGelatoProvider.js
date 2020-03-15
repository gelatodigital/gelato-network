import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask(
  "handleGelatoProvider",
  "Returns default gelatoprovider from network addresbook, if no gelatoprovider is passed"
)
  .addOptionalParam("gelatoprovider")
  .setAction(async ({ gelatoprovider }) => {
    try {
      if (gelatoprovider) return gelatoprovider;
      gelatoprovider = await run("bre-config", {
        addressbookcategory: "gelatoProvider",
        addressbookentry: "default"
      });
      return gelatoprovider;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
