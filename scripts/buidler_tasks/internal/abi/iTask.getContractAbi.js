import { internalTask } from "@nomiclabs/buidler/config";
import { utils } from "ethers";

export default internalTask("getContractABI")
  .addParam("contractname")
  .addFlag("log")
  .setAction(async ({ contractname, log }) => {
    try {
      const contract = await ethers.getContract(contractname);
      const abi = contract.interface.abi;
      if (log) {
        console.log(`\nContractName:  ${contractname}`);
        console.log("ABI:\n", abi, "\n");
      }
      return abi;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
