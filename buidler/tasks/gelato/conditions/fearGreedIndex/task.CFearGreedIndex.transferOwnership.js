import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "g-cfeargreedindex-transferOwnership",
  `Sends tx to ConditionFearGreedIndex.transferOwnership(<newowner>) on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("newowner", "New Owner")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ newowner, log }) => {
    try {
      console.log(newowner)
      const { [0]: provider } = await ethers.getSigners();
      const condition = await run("instantiateContract", {
        contractname: "ConditionFearGreedIndex",
        write: true,
        signer: provider
      });
      const tx = await condition.transferOwnership(newowner);
      if (log) console.log(`\ntxHash set: ${tx.hash}\n`);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
