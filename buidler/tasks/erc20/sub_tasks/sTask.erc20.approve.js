import { internalTask } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../buidler.config";

export default internalTask(
  "erc20:approve",
  `Approves <spender for <amount> of <erc20> on [--network] (default: ${defaultNetwork})`
)
  .addParam("erc20address")
  .addParam("spender", "address")
  .addParam("amount", "uint")
  .addFlag("events")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ erc20address, spender, amount, events, log }) => {
    try {
      const erc20Contract = await run("instantiateContract", {
        contractname: "IERC20",
        contractaddress: erc20address,
        write: true,
      });
      const tx = await erc20Contract.approve(spender, amount);
      if (log) console.log(`\napprove-txHash: ${tx.hash}\n`);
      const { blockHash: blockhash } = await tx.wait();
      if (events) {
        await run("event-getparsedlogsallevents", {
          contractname: "IERC20",
          contractaddress: taskArgs.erc20address,
          blockhash,
          txhash: tx.hash,
          log: true,
        });
      }
      return tx.hash;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
