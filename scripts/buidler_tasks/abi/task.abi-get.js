import { task } from "@nomiclabs/buidler/config";

export default task("abi-get")
  .addPositionalParam("contractname")
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
