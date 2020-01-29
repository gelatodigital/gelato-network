import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../buidler.config";

export default task(
  "debug",
  `Run debugging the debugging <script> on --network (default: ${defaultNetwork})`
)
  .addPositionalParam(
    "scriptname",
    "name of the debug subtask script to execute"
  )
  .addOptionalVariadicPositionalParam(
    "args",
    "The parameters to pass to the script"
  )
  .setAction(async ({ scriptname, args }) => {
    console.log(`\nRunning ${scriptname} ${args ? "with args:\n" + args : ""}`);
    await run(`debug:${scriptname}`, args);
  });
