import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../buidler.config";
import { utils } from "ethers";

export default task(
  "gc-kyber-getexpectedrate",
  `Calls kyber.getExpectedRate(src, dest, srcamt) on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("src", "SellToken")
  .addPositionalParam("dest", "BuyToken")
  .addPositionalParam("srcamt", "How many SellTokens to sell")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ src, dest, srcamt, log }) => {
    try {
      // Read Instance of KyberContract
      const { proxy: kyberProxyAddress } = await run("bre-config", {
        addressbookcategory: "kyber"
      });
      const kyberContract = await run("instantiateContract", {
        contractname: "IKyber",
        contractaddress: kyberProxyAddress,
        read: true
      });

      // Contract Call
      const [
        expectedRate,
        expectedMaxSlippageRate
      ] = await kyberContract.getExpectedRate(src, dest, srcamt);

      if (log) {
        const srcSymbol = await run("bre-config", {
          addressbookcategory: "erc20",
          addressbookentry: src
        });
        const destSymbol = await run("bre-config", {
          addressbookcategory: "erc20",
          addressbookentry: dest
        });
        const fixedExpectedRate = parseFloat(
          utils.formatUnits(expectedRate, 18)
        ).toFixed(2);
        const fixedSlippageRate = parseFloat(
          utils.formatUnits(expectedMaxSlippageRate, 18)
        ).toFixed(2);
        console.log(
          `${srcSymbol}-${destSymbol}
            \nexpectedRate:                         ${expectedRate}\
            \nexpectedRate 18-formatted:            ${fixedExpectedRate}\
            \nexpectedMaxSlippageRate:              ${expectedMaxSlippageRate}\
            \nexpectedMaxSlippageRate 18-formatted: ${fixedSlippageRate}\n`
        );
      }
      return [expectedRate, expectedMaxSlippageRate];
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
