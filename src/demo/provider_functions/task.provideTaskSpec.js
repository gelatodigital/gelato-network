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
        taskSpec = await run(`gelato-return-taskpec-${taskArgs.name}`);
      }

      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        contractaddress: "0xE7418743527a8e5F191bA4e9609b5914c9880a12",
        signer: provider,
        write: true,
      });

      const tx = await gelatoCore.provideTaskSpecs([taskSpec], {
        gasLimit: 1000000,
      });

      const etherscanLink = await run("get-etherscan-link", {
        txhash: tx.hash,
      });
      console.log(etherscanLink);
      await tx.wait();
      console.log(`✅ Tx mined - Task Spec provided`);
      return `✅ Tx mined`;
    } catch (error) {
      console.error(error, "\n");
      console.log(`❌ Tx failed`);
      process.exit(1);
    }
  });
