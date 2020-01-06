import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../buidler.config";

export default task(
  "erc20-allowance",
  `Return (or --log) <erc20address> allowance by <owner> to <spender> on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam(
    "erc20address",
    "Must be in config.networks.[--network].addressbook.erc20"
  )
  .addPositionalParam("owner", "Address: owner of the erc20")
  .addPositionalParam(
    "spender",
    "Address: spender who has the allowance from the owner"
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ erc20address, owner, spender, log }) => {
    await run("checkAddressBook", {
      networkname: network.name,
      category: "erc20",
      entry: erc20address
    });

    const allowance = await run("erc20:allowance", {
      erc20address,
      owner,
      spender
    });

    if (log) {
      const erc20Symbol = await run("bre-config", {
        addressbookcategory: "erc20",
        addressbookentry: erc20address
      });
      console.log(
        `\nNetwork:   ${network.name}\
         \nERC20:     ${erc20Symbol}\
         \nOwner:     ${owner}\
         \nSpender:   ${spender}\
         \nAllowance: ${allowance / 10 ** 18} ${erc20Symbol}\n`
      );
    }

    return allowance;
  });
