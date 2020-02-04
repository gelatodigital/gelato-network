import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-users",
  `Calls GelatoCore.users() on [--network] (default: ${defaultNetwork})`
)
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ log }) => {
    try {
      const gelatoCoreContract = await run("instantiateContract", {
        contractname: "GelatoCore",
        read: true
      });

      const users = await gelatoCoreContract.users();
      if (log) console.log(`\n GelatoCore Users: \n ${users}`);
      return users;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
