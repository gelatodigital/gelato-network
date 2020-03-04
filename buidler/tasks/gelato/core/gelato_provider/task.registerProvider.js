import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-registerprovider",
  `Sends tx to GelatoCore.registerProvider(conditions, actions) on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("ethamount", "The amount of ETH to provide")
  .addVariadicPositionalParam(
    "conditionsandactions",
    "An array of all the conditions and actions to register"
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ ethamount, conditionsandactions, log }) => {
    try {
      // Provider is the 3rd signer account
      const { 2: signer3 } = await ethers.signers();
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        signer: signer3,
        write: true
      });
      const conditions = conditionsandactions.filter(contract => {
        contract.startsWith("Condition");
      });
      const actions = conditionsandactions.filter(contract => {
        contract.startsWith("Action");
      });
      const tx = await gelatoCore.registerProvider(conditions, actions, {
        value: ethamount,
        gasLimit: 2000000
      });
      if (log) console.log(`\n\ntxHash registerProvider: ${tx.hash}`);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
