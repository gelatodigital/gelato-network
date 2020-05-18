import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask(
  "checkContractName",
  "Throws if contractname does not exist inside config.networks.networkName.contracts"
)
  .addParam("contractname")
  .addOptionalParam("networkname")
  .setAction(async ({ contractname, networkname }) => {
    try {
      networkname = await run("handleNetworkName", { networkname });
      if (!checkNestedObj(config.networks, networkname, "contracts"))
        throw new Error(`No config.networks.${networkname}.contracts exists`);
      const contracts = getNestedObj(config.networks, networkname, "contracts");
      if (!contracts.includes(contractname)) {
        throw new Error(
          `contractname: ${contractname} does not exist in config.networks.${networkname}.contracts`
        );
      }
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
