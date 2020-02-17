import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../buidler.config";

export default task(
  "gsp-getmodules",
  `Calls gnosisSafeProxy.getModules() on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam(
    "gnosissafeproxyaddress",
    "The address of gnosis safe proxy we want to interact with"
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ gnosissafeproxyaddress, log }) => {
    try {
      const gnosisSafeProxy = await run("instantiateContract", {
        contractname: "IGnosisSafe",
        contractaddress: gnosissafeproxyaddress,
        read: true
      });

      const modules = await gnosisSafeProxy.getModules();

      if (log) console.log("\n", modules, "\n");

      return modules;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
