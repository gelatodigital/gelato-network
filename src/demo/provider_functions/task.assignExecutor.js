import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../buidler.config";

export default task(
  "gelato-assign-executor",
  `Sends tx to GelatoCore.provideTaskSpecs(<TaskSpecs[]>) on [--network] (default: ${defaultNetwork})`
)
  .addOptionalParam("gelatocoreaddress", "address of gelato core")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ gelatocoreaddress }) => {
    try {
      const provider = getProvider();

      if (!gelatocoreaddress)
        gelatocoreaddress = await run("bre-config", {
          deployments: true,
          contractname: "GelatoCore",
        });

      console.log(gelatocoreaddress);

      const executorAddress = await run("bre-config", {
        addressbook: true,
        addressbookcategory: "gelatoExecutor",
        addressbookentry: "default",
      });

      console.log("1");
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        contractaddress: gelatocoreaddress,
        signer: provider,
        write: true,
      });
      console.log("2");

      const tx = await gelatoCore.providerAssignsExecutor(executorAddress, {
        gasLimit: 1000000,
      });

      const etherscanLink = await run("get-etherscan-link", {
        txhash: tx.hash,
      });
      console.log(`Link to transaction: \n ${etherscanLink}\n`);
      await tx.wait();
      console.log(`✅ Tx mined - Executor assignment complete`);
      return `✅ Tx mined`;
    } catch (error) {
      console.error(error, "\n");
      console.log(`❌ Tx failed`);
      process.exit(1);
    }
  });
