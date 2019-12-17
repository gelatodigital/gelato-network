import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask(
  "checkContractName",
  "Throws if contractname does not exist inside config.networks.networkName.contracts"
)
  .addParam("contractName")
  .addOptionalParam("networkname")
  .setAction(async ({ contractName, networkname }) => {
    try {
      networkname = await run("handleNetworkName", { networkname });
      const contracts = getNestedObj(config.networks, networkname, "contracts");
      if (!contracts.includes(contractName))
        throw new Error(
          `contractname: ${contractName} does not exist in config.networks.${networkname}.contracts`
        );
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
