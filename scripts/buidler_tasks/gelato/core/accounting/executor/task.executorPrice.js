import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../../buidler.config";
import { utils } from "ethers";

export default task(
  "gelato-core-executorprice",
  `Return (or --log) GelatoCore.executorPrice([<executor>: defaults to default executor]) on [--network] (default: ${defaultNetwork})`
)
  .addFlag("log", "Logs return values to stdout")
  .addOptionalPositionalParam(
    "executor",
    "The address of the executor, whose price we query"
  )
  .setAction(async ({ executor, log }) => {
    try {
      let executorAddress;
      if (executor) executorAddress = executor;
      else
        executorAddress = await run("bre-config", {
          addressbookcategory: "executor",
          addressbookentry: "default"
        });

      const gelatoCoreContract = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true
      });
      const executorPrice = await gelatoCoreContract.executorPrice(
        executorAddress
      );
      const executorPriceGwei = utils.formatUnits(executorPrice, "gwei");
      if (log)
        console.log(
          `\nNetwork: ${network.name}\nExecutor: ${executorAddress}\nPrice: ${executorPriceGwei} gwei\n`
        );
      return executorPrice;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
