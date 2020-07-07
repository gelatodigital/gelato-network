import { task, types } from "@nomiclabs/buidler/config";
import { constants, utils } from "ethers";

export default task(
  "gelato-whitelist-gnosis-ui-task-specs",
  `Returns a hardcoded task spec for the tradeAndWithdraw Script`
)
  .addFlag("log")
  .setAction(async ({ log }) => {
    try {
      const provider = getProvider();

      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        signer: provider,
        write: true,
      });

      const taskSpecs = [
        "balance-trade-ui",
        "kyber-price-trade-ui",
        "time-trade-ui",
        // "withdraw-ui",
      ];

      const taskSpecsToWhitelist = [];

      for (const taskSpecName of taskSpecs) {
        taskSpecsToWhitelist.push(
          await run(`gelato-return-taskspec-${taskSpecName}`)
        );
      }

      const tx = await gelatoCore.provideTaskSpecs(taskSpecsToWhitelist, {
        gasLimit: 1000000,
      });

      const etherscanLink = await run("get-etherscan-link", {
        txhash: tx.hash,
      });
      console.log(`Link to transaction: \n ${etherscanLink}\n`);
      await tx.wait();
      console.log(`✅ Tx mined - Task Spec provided`);
      return `✅ Tx mined`;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
