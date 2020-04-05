import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../buidler.config";

export default task(
  "erc20-balance",
  `Return (or --log) <erc20address> balance of <owner> on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("erc20name")
  .addPositionalParam("owner", "Address: use with (--allowance & --spender)")
  .addOptionalParam(
    "erc20address",
    "Defaults to config.networks.[--network].addressbook.erc20"
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async taskArgs => {
    if (!taskArgs.erc20address) {
      taskArgs.erc20address = await run("bre-config", {
        addressbookcategory: "erc20",
        addressbookentry: taskArgs.erc20name
      });
    }

    if (taskArgs.log) console.log(taskArgs);

    const balance = await run("erc20:balance", taskArgs);

    if (taskArgs.log) {
      console.log(
        `\nNetwork: ${network.name}\
         \nERC20:   ${taskArgs.erc20Symbol}\
         \nOwner:   ${taskArgs.owner}\
         \nBalance: ${taskArgs.balance}\
         \nBalance: ${taskArgs.balance / 10 ** 18} ${taskArgs.erc20Symbol}\n`
      );
    }

    return balance;
  });
