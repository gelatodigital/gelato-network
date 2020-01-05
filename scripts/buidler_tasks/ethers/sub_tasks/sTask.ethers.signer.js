import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask(
  "ethers:signer",
  "Returns the default buidler-ethers Signer object"
)
  .addFlag("address", "Return the signer._address")
  .addFlag("ethbalance", "Logs the default Signer's ETH balance")
  .addOptionalParam("block", "Block height to check for signer's balance")
  .setAction(async ({ address, ethbalance, block }) => {
    try {
      const returnValues = [];

      const [signer] = await ethers.signers();

      if (address) returnValues.push(signer._address);

      if (ethbalance) {
        let balance;
        if (block) {
          if (isNaN(block)) balance = await signer.getBalance(block);
          else balance = await signer.getBalance(utils.bigNumberify(block));
        } else {
          balance = await signer.getBalance();
        }
        returnValues.push(balance);
      }

      if (returnValues.length == 0) return signer;
      else if (returnValues.length == 1) return returnValues[0];
      else return returnValues;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
