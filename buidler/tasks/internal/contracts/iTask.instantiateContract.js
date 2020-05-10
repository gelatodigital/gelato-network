import { internalTask } from "@nomiclabs/buidler/config";
import { Contract } from "ethers";

export default internalTask(
  "instantiateContract",
  "Returns a --read or --write instance of --contractname on [--network]"
)
  .addParam("contractname")
  .addOptionalParam("contractaddress")
  .addOptionalParam(
    "signer",
    "The signer object (private key) that will be used to send tx to the contract",
    undefined,
    types.json
  )
  .addFlag("read")
  .addFlag("write")
  .setAction(async ({ contractname, contractaddress, signer, read, write }) => {
    try {
      if (!read && !write)
        throw new Error("\ninstantiateContract: must specify read or write");

      if (!contractaddress) {
        contractaddress = await run("bre-config", {
          deployments: true,
          contractname,
        });
      }
      const abi = await run("abi-get", { contractname });

      let instance;
      if (read) {
        instance = new Contract(contractaddress, abi, ethers.provider);
      } else if (write) {
        if (!signer) [signer] = await ethers.getSigners();
        instance = new Contract(contractaddress, abi, signer);
      }
      return instance;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
