import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../buidler.config";

export default task(
  "gelato-approve-erc20",
  `Send tx to <erc20address> to approve <spender> for <amount> and return (or --log) tx hash on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam(
    "erc20address",
    "Defaults to config.networks.[--network].addressbook.erc20"
  )
  .addPositionalParam("amount", "Uint: <amount> to approve <spender> for")
  .addPositionalParam("spender", "Address of approvee")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async (taskArgs) => {
    const user = getUser();
    const erc20Contract = await run("instantiateContract", {
      contractname: "IERC20",
      contractaddress: taskArgs.erc20address,
      write: true,
      signer: user,
    });

    console.log(`
      Approving ${taskArgs.amount} of token: ${taskArgs.erc20address}\n
      Spender: ${taskArgs.spender}\n
    `);

    const tx = await erc20Contract.approve(taskArgs.spender, taskArgs.amount);
    const etherscanLink = await run("get-etherscan-link", {
      txhash: tx.hash,
    });
    console.log(etherscanLink);
    console.log(`✅ Tx mined`);
    return `✅ Tx mined`;
  });
