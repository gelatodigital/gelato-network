import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../buidler.config";
import { utils } from "ethers";

export default task(
  "eth",
  `Send tx to <erc20address> to approve <spender> for <amount> and return (or --log) tx hash on [--network] (default: ${defaultNetwork})`
)
  .addOptionalParam("account", "The account's address")
  .addFlag(
    "balance",
    `Return or --log ([<account>: defaults to ethers signer]) ETH balance on [--network] (default: ${defaultNetwork})`
  )
  .addFlag("usd", "Return the etherscan ETH-USD price")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ account, balance, usd, log }) => {
    try {
      if (!balance && !usd)
        throw new Error("Must call with --balance or --price or combo");

      const returnValues = [];
      const returnObj = {};

      if (balance) {
        const balance = await run("eth:balance", { account });
        returnValues.push(balance);
        returnObj.balance = balance;
        if (log)
          console.log(
            `\n${utils.formatEther(balance)} ETH (on ${network.name})`
          );
      }

      if (usd) {
        const ethUSDPrice = await run("eth:usd");
        returnValues.push(ethUSDPrice);
        returnObj.usd = ethUSDPrice;
        if (log) console.log(`\nETH price in USD: ${ethUSDPrice}$\n`);
      }

      if (returnValues.length == 1) {
        if (log) console.log(returnValues[0]);
        return returnValues[0];
      } else {
        if (log) console.dir(returnObj);
        return returnObj;
      }
    } catch (error) {
      console.error(err);
      process.exit(1);
    }
  });
