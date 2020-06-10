import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../buidler.config";
import { constants } from "ethers";

export default task(
  "gelato-whitelist-fee-tokens",
  `Sends tx to GelatoCore.provideTaskSpecs(<TaskSpecs[]>) on [--network] (default: ${defaultNetwork})`
)
  .addVariadicPositionalParam(
    "feetokens",
    "list of fee tokens to be accepted by the fee actions",
    undefined,
    types.json
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ feetokens }) => {
    try {
      if (feetokens === undefined) throw Error("Please include some tokens");
      const provider = getProvider();
      const providerAddress = await provider.getAddress();

      // Check if Provider State Setter is already deployed
      const feeHandlerFactory = await run("instantiateContract", {
        contractname: "FeeHandlerFactory",
        signer: provider,
        write: true,
      });

      console.log(`Tokens to be included for your fee actions:`);
      for (const token of feetokens) {
        console.log(`${token}\n`);
      }

      // We dont have a FeeHandler for this fee yet, lets deploy a new one
      const tx = await feeHandlerFactory.addTokensToWhitelist(feetokens);

      const etherscanLink = await run("get-etherscan-link", {
        txhash: tx.hash,
      });
      console.log(etherscanLink);
      await tx.wait();
      console.log(`✅ Tx mined - Fee Tokens updated`);

      return `✅ Tx mined`;
    } catch (error) {
      console.error(error, "\n");
      console.log(`❌ Tx failed`);
      process.exit(1);
    }
  });
