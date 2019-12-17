import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask(
  "bre-config:networks:contracts",
  `Returns bre.config.networks.networkName.contracts`
)
  .addParam("networkname")
  .setAction(async ({ networkname }) => {
    try {
      networkname = await run("handleNetworkName", { networkname });
      if (!checkNestedObj(config, "networks", networkname, "contracts"))
        throw new Error(
          `No contracts defined for config.networks.${networkname}`
        );
      return config.networks[networkname].contracts;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
