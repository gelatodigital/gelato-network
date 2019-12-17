import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask(
  "bre-config:networks:addressbook",
  "Returns bre.config.networks.networkName.addressbook.[category].[entry]"
)
  .addOptionalParam("networkname")
  .addOptionalParam("category")
  .addOptionalParam("entry")
  .setAction(async ({ networkname, category, entry }) => {
    try {
      networkname = await run("handleNetworkName", { networkname });
      await run("checkAddressBook", {
        networkname,
        category,
        entry
      });
      if (!category && !entry) return config.networks[networkname].addressBook;
      else if (category && !entry)
        return config.networks[networkname].addressBook[category];
      else return config.networks[networkname].addressBook[category][entry];
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
