import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../buidler.config";
import { utils } from "ethers";

export default task(
  "transfer-ether",
  `sends ether to different address`
).setAction(async (taskArgs) => {
  try {
    const deployer = getSysAdmin();

    const tx = {
      to: "0x99E69499973484a96639f4Fb17893BC96000b3b8",
      value: ethers.utils.parseEther("1"),
      gasPrice: ethers.utils.parseUnits("85", "gwei"),
    };

    // Sending ether
    const sendTx = await deployer.sendTransaction(tx);
    console.log(sendTx);
    await sendTx.wait();
    console.log("done");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});
