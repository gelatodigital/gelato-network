import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";

export default task(
  "gc-usercount",
  `Calls GelatoCore.usercount() on [--network] (default: ${defaultNetwork})`
)
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ log }) => {
    try {
      const gelatoCoreContract = await run("instantiateContract", {
        contractname: "GelatoCore",
        read: true
      });

      const userCount = await gelatoCoreContract.userCount();
      if (log) console.log(`\n GelatoCore number of users: ${userCount}`);
      return userCount;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
