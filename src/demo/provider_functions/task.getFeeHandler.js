import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../buidler.config";
import { constants } from "ethers";

export default task(
  "gelato-get-fee-handler",
  `Sends tx to GelatoCore.provideTaskSpecs(<TaskSpecs[]>) on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("fee", "Fee that you want this action to have")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ fee }) => {
    try {
      const provider = getProvider();
      const providerAddress = await provider.getAddress();

      // Check if Provider State Setter is already deployed
      const feeHandlerFactory = await run("instantiateContract", {
        contractname: "FeeHandlerFactory",
        signer: provider,
        write: true,
      });

      const feeNumerator = fee * 10000;

      let feeHandlerAddress = await feeHandlerFactory.feeHandlerByProviderAndNum(
        providerAddress,
        feeNumerator
      );

      if (feeHandlerAddress !== constants.AddressZero) {
        console.log(
          `FeeHandler is already deployed. Its address is: ${feeHandlerAddress}`
        );
      } else {
        console.log(`
        \n Fee: ${fee}
        `);
        // We dont have a FeeHandler for this fee yet, lets deploy a new one
        const tx = await feeHandlerFactory.create(feeNumerator);

        const etherscanLink = await run("get-etherscan-link", {
          txhash: tx.hash,
        });
        console.log(etherscanLink);
        await tx.wait();
        console.log(`✅ Tx mined - Fee updated`);

        feeHandlerAddress = await feeHandlerFactory.feeHandlerByProviderAndNum(
          providerAddress,
          feeNumerator
        );

        console.log(`
        \n FeeHandler Action Address: ${feeHandlerAddress}
        --------------------------
        \n Fee: ${fee}

        \n Call this action before any other to extract fees from users first
        `);
      }
      return feeHandlerAddress;
    } catch (error) {
      console.error(error, "\n");
      console.log(`❌ Tx failed`);
      process.exit(1);
    }
  });
