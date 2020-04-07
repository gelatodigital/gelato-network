import { internalTask } from "@nomiclabs/buidler/config";

export default internalTask(
  "ethers:signers",
  "Returns the BRE configured buidler-ethers Signer objects"
)
  .addFlag("address", "Log the addresses of the Signers")
  .setAction(async ({ address }) => {
    try {
      const signers = await ethers.getSigners();
      if (address) {
        const signerAddresses = [];
        for (const signer of signers) signerAddresses.push(signer._address);
        return signerAddresses;
      }
      return signers;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
