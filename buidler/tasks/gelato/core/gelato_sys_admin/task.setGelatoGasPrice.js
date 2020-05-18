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
      const gelatoGasPriceOracle = await run("instantiateContract", {
        contractname: "GelatoGasPriceOracle",
        write: true,
      });
      const tx = await gelatoGasPriceOracle.setGasPrice(gasprice);
      if (log) console.log(`\n\ntxHash setGelatoGasPrice: ${tx.hash}`);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
