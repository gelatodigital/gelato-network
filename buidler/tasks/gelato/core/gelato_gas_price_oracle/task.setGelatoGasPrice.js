import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-setgelatogasprice",
  `Sends tx to GelatoCore.setGelatoGasPrice(<lifespan>) on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam(
    "gasprice",
    "The new gasPrice which is used to settle payments between providers and executors"
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ gasprice, log }) => {
    try {
      const gelatoCoreContract = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true
      });
      const tx = await gelatoCoreContract.setGelatoGasPrice(gasprice);
      if (log) console.log(`\n\ntxHash setGelatoGasPrice: ${tx.hash}`);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
