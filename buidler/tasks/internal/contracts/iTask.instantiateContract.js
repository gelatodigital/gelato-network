import { internalTask } from "@nomiclabs/buidler/config";
import { Contract } from "ethers";

export default internalTask(
  "instantiateContract",
  "Returns a --read or --write instance of --contractname on [--network]"
)
  .addParam("contractname")
  .addOptionalParam("contractaddress")
  .addFlag("read")
  .addFlag("write")
  .setAction(async ({ contractname, contractaddress, read, write }) => {
    try {
      if (!contractaddress)
        contractaddress = await run("bre-config", {
          deployments: true,
          contractname
        });
      const abi = await run("abi-get", { contractname });

      let instance;
      if (read) {
        instance = new Contract(contractaddress, abi, ethers.provider);
      } else if (write) {
        const [signer] = await ethers.signers();
        instance = new Contract(contractaddress, abi, signer);
      }
      return instance;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
