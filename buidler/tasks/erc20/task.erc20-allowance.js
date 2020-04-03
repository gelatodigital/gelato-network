import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../buidler.config";

export default task(
  "erc20-allowance",
  `Return (or --log) <erc20address> allowance by <owner> to <spender> on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("erc20name")
  .addPositionalParam("owner", "Address: owner of the erc20")
  .addPositionalParam(
    "spender",
    "Address: spender who has the allowance from the owner"
  )
  .addOptionalParam(
    "erc20address",
    "Defaults to config.networks.[--network].addressbook.erc20"
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async taskArgs => {
    if (!taskArgs.erc20address) {
      taskArgs.erc20address = await run("bre-config", {
        addressbookcategory: "erc20",
        addressbookentry: erc20name
      });
    }

    if (taskArgs.log) console.log(taskArgs);

    const allowance = await run("erc20:allowance", taskArgs);

    if (taskArgs.log) {
      console.log(
        `\nNetwork:   ${network.name}\
         \nERC20:     ${taskArgs.erc20name}\
         \nOwner:     ${taskArgs.owner}\
         \nSpender:   ${taskArgs.spender}\
         \nAllowance: ${allowance / 10 ** 18} ${taskArgs.erc20name}\n`
      );
    }

    return allowance;
  });
