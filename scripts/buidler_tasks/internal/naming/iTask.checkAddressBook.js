import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask("checkAddressBook")
  .addOptionalParam("category")
  .addOptionalParam("entry")
  .addOptionalParam("networkname")
  .setAction(async ({ networkname, category, entry }) => {
    try {
      networkname = await run("handleNetworkName", { networkname });

      if (!checkNestedObj(config.networks, networkname, "addressBook"))
        throw new Error(`No addressBook for network: ${networkname}`);

      if (category) {
        if (
          !checkNestedObj(config.networks, networkname, "addressBook", category)
        ) {
          throw new Error(
            `Category: ${category} does not exist in config.networks.${networkname}.addressBook`
          );
        }
      }

      if (entry) {
        if (
          !checkNestedObj(
            config.networks,
            networkname,
            "addressBook",
            category,
            entry
          )
        ) {
          throw new Error(
            `Entry: ${entry} does not exist in config.networks.${networkname}.addressBook.${category}`
          );
        }
      }
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
