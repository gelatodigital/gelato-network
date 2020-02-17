import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask(
  "bre-config:networks:addressbook",
  "Returns bre.config.networks.networkName.addressbook.[addressbookcategory].[addressbookentry]"
)
  .addOptionalParam("networkname")
  .addOptionalParam("addressbookcategory")
  .addOptionalParam("addressbookentry")
  .setAction(async ({ networkname, addressbookcategory, addressbookentry }) => {
    try {
      networkname = await run("handleNetworkName", { networkname });
      await run("checkAddressBook", {
        networkname,
        addressbookcategory,
        addressbookentry
      });
      if (!addressbookcategory && !addressbookentry)
        return config.networks[networkname].addressBook;
      else if (addressbookcategory && !addressbookentry)
        return config.networks[networkname].addressBook[addressbookcategory];
      else
        return config.networks[networkname].addressBook[addressbookcategory][
          addressbookentry
        ];
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
