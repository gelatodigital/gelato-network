import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../buidler.config";

export default task(
  "gelato-whitelist-taskspec",
  `Sends tx to GelatoCore.provideTaskSpecs(<TaskSpecs[]>) on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam(
    "name",
    "name of taskspec task that returns default task spec"
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async (taskArgs) => {
    try {
      const provider = getProvider();

      let taskSpec;
      // ###### Either use name
      if (taskArgs.name) {
        taskSpec = await run(`gelato-return-taskspec-${taskArgs.name}`);
      }

      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        signer: provider,
        write: true,
      });

      const tx = await gelatoCore.provideTaskSpecs([taskSpec], {
        gasLimit: 1000000,
      });

      const etherscanLink = await run("get-etherscan-link", {
        txhash: tx.hash,
      });
      console.log(`Link to transaction: \n ${etherscanLink}\n`);
      await tx.wait();
      console.log(`✅ Tx mined - Task Spec provided`);
      return `✅ Tx mined`;
    } catch (error) {
      console.error(error, "\n");
      console.log(`❌ Tx failed`);
      process.exit(1);
    }
  });
