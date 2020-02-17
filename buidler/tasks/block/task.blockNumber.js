import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../buidler.config";

export default task(
  "block-number",
  `Logs the current block number on [--network] (default: ${defaultNetwork})`
)
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ log }, { ethers }) => {
    try {
      const blockNumber = await ethers.provider.getBlockNumber();
      if (log)
        console.log(
          `\n${ethers.provider._buidlerProvider._networkName}: ${blockNumber}\n`
        );
      return blockNumber;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
