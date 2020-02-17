import { internalTask } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../buidler.config";

export default internalTask(
  "eth:balance",
  `Return ([<account>: defaults to ethers signer]) ETH balance on [--network] (default: ${defaultNetwork})`
)
  .addOptionalPositionalParam("account", "The account's address")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ account }) => {
    try {
      if (!account)
        account = await run("ethers", { signer: true, address: true });
      const balance = await ethers.provider.getBalance(account);
      return balance;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
