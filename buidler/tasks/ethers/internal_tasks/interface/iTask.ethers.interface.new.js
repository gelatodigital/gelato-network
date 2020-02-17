import { internalTask } from "@nomiclabs/buidler/config";
import { Interface } from "ethers/utils";

export default internalTask(
  "ethers-interface-new",
  "Returns the ethers.utils.Interface for <contractname>"
)
  .addParam("contractname")
  .setAction(async ({ contractname }) => {
    try {
      const abi = await run("abi-get", { contractname });
      const contractInterface = new Interface(abi);
      return contractInterface;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
