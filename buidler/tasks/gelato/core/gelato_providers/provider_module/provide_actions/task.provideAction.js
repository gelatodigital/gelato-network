import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../../../buidler.config";

export default task(
  "gc-provideaction",
  `Sends tx to GelatoCore.setActionGasPriceCeil(<actionname>) on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("actionname")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ actionname, log }) => {
    try {
      const action = await run("bre-config", {
        deployments: true,
        contractname: actionname
      });
      // Gelato Provider is the 3rd signer account
      const { 2: gelatoProvider } = await ethers.signers();
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        signer: gelatoProvider,
        write: true
      });
      const tx = await gelatoCore.setActionGasPriceCeil(action);
      if (log) console.log(`\n txHash setActionGasPriceCeil: ${tx.hash}\n`);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
