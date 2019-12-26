import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";
import { Contract } from "ethers";

export default task(
  "gelato-core-createuserproxy",
  `Sends tx to GelatoCore.createUserProxy() on [--network] (default: ${defaultNetwork})`
).setAction(async () => {
  try {
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
    console.log(`\n\ntxHash createUserProxy: ${tx.hash}`);
    return tx.hash;
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
});
