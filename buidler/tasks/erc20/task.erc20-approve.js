import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../buidler.config";

export default task(
  "erc20-approve",
  `Send tx to <erc20address> to approve <spender> for <amount> and return (or --log) tx hash on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam("erc20name")
  .addPositionalParam("spender", "Address of approvee")
  .addPositionalParam("amount", "Uint: <amount> to approve <spender> for")
  .addOptionalParam(
    "erc20address",
    "Defaults to config.networks.[--network].addressbook.erc20"
  )
  .addFlag("events", "Logs Event Logs to stdout")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async taskArgs => {
    if (!taskArgs.erc20address) {
      taskArgs.erc20address = await run("bre-config", {
        addressbookcategory: "erc20",
        addressbookentry: taskArgs.erc20name
      });
    }
    if (taskArgs.log) console.log(taskArgs);
    const txHash = await run("erc20:approve", taskArgs);
    return txHash;
  });
