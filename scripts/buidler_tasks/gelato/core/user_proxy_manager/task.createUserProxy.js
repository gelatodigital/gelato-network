import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";
import { Contract } from "ethers";

export default task(
  "gelato-core-createuserproxy",
  `Sends tx to GelatoCore.createUserProxy() on [--network] (default: ${defaultNetwork})`
)
  .addFlag("log", "Logs return values to stdout")
  .setAction(async () => {
    try {
      // To avoid mistakes default log to true
      log = true;
      const [signer] = await ethers.signers();
      const gelatoCoreAdddress = await run("bre-config", {
        deployments: true,
        contractname: "GelatoCore"
      });
      const gelatoCoreABI = [
        "function createUserProxy() external returns(address)"
      ];
      const gelatoCoreContract = new Contract(
        gelatoCoreAdddress,
        gelatoCoreABI,
        signer
      );
      const tx = await gelatoCoreContract.createUserProxy();
      await tx.wait();
      if (log) console.log(`\n\ntxHash createUserProxy: ${tx.hash}`);
      return tx.hash;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
