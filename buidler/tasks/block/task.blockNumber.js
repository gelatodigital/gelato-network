import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../buidler.config";

export default task(
  "block",
  `Return or --log block info from [--network] (default: ${defaultNetwork})`
)
  .addFlag("number")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async taskArgs => {
    try {
      if (Object.keys(taskArgs).length === 0)
        throw new Error(`\n Must supply task arguments or flags\n`);

      const returnObj = {};

      if (taskArgs.number)
        returnObj.blockNumber = await ethers.provider.getBlockNumber();

      if (taskArgs.log) console.log(`\nNetwork: ${network.name}\n`, returnObj);
      return returnObj;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
