import { task, types } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";
import { constants, utils } from "ethers";

export default task(
  "gc-createCpkProxyAndSwap",
  `Creates Cpk proxy for user, sells on batch exchange and tasks a gelato bot to withdraw the funds later and send them back to the users EOA on ${defaultNetwork})`
)
  .addOptionalParam(
    "mnemonicIndex",
    "index of mnemonic in .env that will be used for the user address",
    "0"
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async (taskArgs) => {
    // 1. Determine CPK proxy address of user (mnemoric index 0 by default)
    const { [taskArgs.mnemonicIndex]: user } = await ethers.getSigners();
    const userAddress = await user.getAddress();
    const safeAddress = await run("gc-determineCpkProxyAddress", {
      useraddress: userAddress,
    });

    console.log(safeAddress);

    // 2. Approve proxy address to move X amount of DAI

    const sellAmount = ethers.utils.parseUnits("4", "18");
    const buyAmount = ethers.utils.parseUnits("3.8", "6");

    const { DAI: daiAddress, USDC: usdcAddress } = await run("bre-config", {
      addressbookcategory: "erc20",
    });

    const dai = await run("instantiateContract", {
      contractaddress: daiAddress,
      contractname: "ERC20",
      write: true,
    });

    // Check if user has sufficient balance
    const sellTokenBalance = await dai.balanceOf(userAddress);
    if (sellTokenBalance < sellAmount)
      throw new Error("Insufficient sellToken to conduct enter stableswap");

    // await dai.approve(safeAddress, sellAmount);

    // 3. Encode EnterStableSwap Script

    const txPayload = await run(
      `gsp:scripts:defaultpayload:ScriptEnterStableSwap`,
      {
        sellToken: daiAddress,
        sellAmount,
        buyToken: usdcAddress,
        buyAmount,
      }
    );

    // 4. If proxy was deployed, only execTx, if not, createProxyAndExecTx
  });
