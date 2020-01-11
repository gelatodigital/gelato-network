import { internalTask } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default internalTask(
  "bre-config:networks",
  `Returns bre.config.network info`
)
  .addFlag("addressbook")
  .addOptionalParam("addressbookcategory")
  .addOptionalParam("addressbookentry")
  .addFlag(
    "contracts",
    "Return a list of contract names available for deployment"
  )
  .addOptionalParam("contractname")
  .addFlag("deployments", "Return a list of deployed contract instances")
  .addOptionalParam(
    "networkname",
    `Use with --networks to get info for a specific network (default: ${defaultNetwork})`
  )
  .setAction(
    async ({
      addressbook,
      addressbookcategory,
      addressbookentry,
      contracts,
      contractname,
      deployments,
      networkname
    }) => {
      try {
        const returnValues = [];

        if (networkname) await run("checkNetworkName", { networkname });

        if (addressbook || addressbookcategory || addressbookentry) {
          if (addressbookentry && !addressbookcategory)
            throw new Error(
              "Must supply --addressbookcategory for --addressbookentry"
            );
          const addressbookInfo = await run("bre-config:networks:addressbook", {
            networkname,
            addressbookcategory,
            addressbookentry
          });
          returnValues.push(addressbookInfo);
        }

        if (contracts) {
          const contractsInfo = await run("bre-config:networks:contracts", {
            networkname
          });
          returnValues.push(contractsInfo);
        }

        if (deployments) {
          const deploymentsInfo = await run("bre-config:networks:deployments", {
            contractname,
            networkname
          });
          returnValues.push(deploymentsInfo);
        }

        if (returnValues.length == 0)
          return networkname ? config.networks[networkname] : config.networks;
        if (returnValues.length == 1) return returnValues[0];
        else return returnValues;
      } catch (err) {
        console.error(err);
        process.exit(1);
      }
    }
  );
