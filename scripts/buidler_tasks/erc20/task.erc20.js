import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../buidler.config";
import assert from "assert";

export default task(
  "erc20",
  `A suite of erc20 related actions to perform on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam(
    "erc20address",
    "Must be in config.networks.[--network].addressbook.erc20"
  )
  .addFlag(
    "allowance",
    "Return (or --log) <erc20address> allowance by --owner to --spender"
  )
  .addOptionalParam("amount", "Uint: use with --approve")
  .addFlag(
    "approve",
    "Send tx to <erc20address> to approve <spender> for <amount> and return (or --log) tx hash"
  )
  .addFlag("log", "Logs return values to stdout")
  .addOptionalParam("owner", "Address: use with (--allowance & --spender)")
  .addOptionalParam(
    "spender",
    "Address: use with --approve or (--allowance & --owner)"
  )
  .setAction(
    async ({
      erc20address,
      allowance,
      amount,
      approve,
      log,
      owner,
      spender
    }) => {
      assert(approve || allowance, "Use erc20 with --approve or --allowance");

      const returnValues = [];

      await run("checkAddressBook", {
        networkname: network.name,
        category: "erc20",
        entry: erc20address
      });

      if (approve) {
        const txHash = await run("erc20:approve", {
          erc20address,
          spender,
          amount
        });
        if (log) {
          const ERC20 = await run("bre-config", {
            addressbookcategory: "erc20",
            addressbookentry: erc20address
          });
          console.log(
            `\n Approved spender: ${spender} for ${amount / 10 ** 18} ${ERC20}`
          );
          console.log(`\napprove-txHash: ${txHash}\n`);
        }
        returnValues.push({ approveTxHash: txHash });
      }

      if (allowance) {
        const value = await run("erc20:allowance", {
          erc20address,
          owner,
          spender
        });
        if (log) console.log(`\nallowance: ${value}\n`);
        returnValues.push(value);
      }

      if (returnValues.length == 0)
        throw new Error("erc20 task: no return values");
      else if (returnValues.length == 1) return returnValues[0];
      return returnValues;
    }
  );
