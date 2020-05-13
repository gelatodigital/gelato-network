import { internalTask } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../buidler.config";
import { utils } from "ethers";

export default internalTask(
  "get-etherscan-link",
  `Gets etherscan link of current network`
)
  .addPositionalParam("txhash", "transaction hash")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ txhash, log }) => {
    try {
      let etherscanPrefix;
      switch (network.config.chainId) {
        case 1:
          etherscanPrefix = "";
        case 3:
          etherscanPrefix = "ropsten.";
          break;
        case 4:
          etherscanPrefix = "rinkeby.";
          break;
        case 42:
          etherscanPrefix = "kovan.";
          break;
        default:
          etherscanPrefix = "";
          break;
      }
      const etherscanLink = `https://${etherscanPrefix}etherscan.io/tx/${txhash}`;
      return `Link to transaction: \n${etherscanLink}\n`;
      //   return tx.hash;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });

// if (taskArgs.log)
//   console.log(`\n txHash execTransaction: ${executeTx.hash}\n
//         \nhttps://rinkeby.etherscan.io/tx/${executeTx.hash}\n`);
