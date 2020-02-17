import { internalTask } from "@nomiclabs/buidler/config";
import { providers } from "ethers";

export default internalTask(
  "eth:usd",
  "Return the etherscan ETH-USD price",
  async () => {
    try {
      const etherscanProvider = new providers.EtherscanProvider();
      const ethUSDPrice = await etherscanProvider.getEtherPrice();
      return ethUSDPrice;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  }
);
