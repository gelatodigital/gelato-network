import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gsp-isowner",
  `Calls gnosisSafeProxy.isOwner([<address>: defaults to ethers signer]) on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam(
    "gnosissafeproxyaddress",
    "The address of gnosis safe proxy we want to interact with"
  )
  .addOptionalPositionalParam(
    "address",
    "The address whose gnosis safe proxy ownership we want to test"
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ gnosissafeproxyaddress, address, log }) => {
    try {
      if (!address)
        address = await run("ethers", { signer: true, address: true });

      const gnosisSafeProxy = await run("instantiateContract", {
        contractname: "IGnosisSafe",
        contractaddress: gnosissafeproxyaddress,
        read: true
      });

      const isOwner = await gnosisSafeProxy.isOwner(address);

      if (log) {
        console.log(
          `\n GnosisSafeProxy ${gnosissafeproxyaddress}\
           \n Address:        ${address}\
           \n isOwner?:       ${isOwner ? "true ✅" : "false ❌"}\n`
        );
      }
      return isOwner;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
