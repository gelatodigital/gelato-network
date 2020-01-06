import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../buidler.config";

export default task(
  "erc20-balance",
  `Return (or --log) <erc20address> balance of <owner> on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam(
    "erc20address",
    "Must be in config.networks.[--network].addressbook.erc20"
  )
  .addPositionalParam("owner", "Address: use with (--allowance & --spender)")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ erc20address, owner, log }) => {
    await run("checkAddressBook", {
      networkname: network.name,
      category: "erc20",
      entry: erc20address
    });

    const balance = await run("erc20:balance", { erc20address, owner });

    if (log) {
      const erc20Symbol = await run("bre-config", {
        addressbookcategory: "erc20",
        addressbookentry: erc20address
      });
      console.log(
        `\nNetwork: ${network.name}\
         \nERC20:   ${erc20Symbol}\
         \nOwner:   ${owner}\
         \nBalance: ${balance / 10 ** 18} ${erc20Symbol}\n`
      );
    }

    return balance;
  });
