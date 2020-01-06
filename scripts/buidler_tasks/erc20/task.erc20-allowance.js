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
  .addFlag("balance", "Return (or --log) <erc20address> balance of --owner")
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
      balance,
      amount,
      approve,
      log,
      owner,
      spender
    }) => {
      assert(
        approve || allowance || balance,
        "Use erc20 with --approve or --allowance"
      );

      const returnValues = [];

      await run("checkAddressBook", {
        networkname: network.name,
        category: "erc20",
        entry: erc20address
      });

      const erc20Symbol = await run("bre-config", {
        addressbookcategory: "erc20",
        addressbookentry: erc20address
      });

      if (!owner) owner = await run("ethers", { signer: true, address: true });

      if (approve) {
        const txHash = await run("erc20:approve", {
          erc20address,
          spender,
          amount,
          log
        });
        if (log)
          console.log(
            `\nApproved spender: ${spender} for ${amount /
              10 ** 18} ${erc20Symbol}\napprove-txHash: ${txHash}\n`
          );
        returnValues.push({ approveTxHash: txHash });
      }

      if (allowance) {
        const value = await run("erc20:allowance", {
          erc20address,
          owner,
          spender
        });
        if (log)
          console.log(
            `\nAllowance of\nspender:  ${spender}\nby owner: ${owner}\n${value /
              10 ** 18} ${erc20Symbol}\n`
          );
        returnValues.push(value);
      }

      if (balance) {
        const value = await run("erc20:balance", {
          erc20address,
          owner
        });
        if (log)
          console.log(
            `\nBalance of owner: ${owner}\n${value / 10 ** 18} ${erc20Symbol}\n`
          );
        returnValues.push(value);
      }

      if (returnValues.length == 0)
        throw new Error("erc20 task: no return values");
      else if (returnValues.length == 1) return returnValues[0];
      return returnValues;
    }
  );
