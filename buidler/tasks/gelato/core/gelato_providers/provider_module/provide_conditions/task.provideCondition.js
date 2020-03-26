import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../../../buidler.config";

export default task(
  "gc-providecondition",
  `Sends tx to GelatoCore.provideCondition(<condition>) on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("conditionname")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ conditionname, log }) => {
    try {
      const condition = await run("bre-config", {
        deployments: true,
        contractname: conditionname
      });
      // Gelato Provider is the 3rd signer account
      const { 2: gelatoProvider } = await ethers.signers();
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        signer: gelatoProvider,
        write: true
      });
      const tx = await gelatoCore.provideCondition(condition);
      if (log) console.log(`\n txHash provideCondition: ${tx.hash} \n`);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
