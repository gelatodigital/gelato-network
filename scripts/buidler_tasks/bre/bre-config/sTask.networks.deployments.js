import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask(
  "bre-config:networks:deployments",
  `Returns bre.config.networks.networkName.deployments`
)
  .addParam("networkname")
  .setAction(async ({ networkname }) => {
    try {
      networkname = await run("handleNetworkName", { networkname });
      if (!checkNestedObj(config, "networks", networkname, "deployments"))
        throw new Error(
          `No deployments defined for config.networks.${networkname}`
        );
      return config.networks[networkname].deployments;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
