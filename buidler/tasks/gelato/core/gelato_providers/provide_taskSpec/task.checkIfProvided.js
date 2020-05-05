import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../../buidler.config";

export default task(
  "gc-check-if-provided",
  `Checks if task spec is whitelisted by given provided on [--network] (default: ${defaultNetwork})`
)
  .addOptionalPositionalParam(
    "task",
    "the task object - not possible through cli"
  )
  .addOptionalPositionalParam(
    "taskspecname",
    "name of default task spec found in dapps folder"
  )
  .addPositionalParam(
    "provider",
    "address of provider who should have provided the task spec",
    "0x518eAa8f962246bCe2FA49329Fe998B66d67cbf8",
    types.string
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async (taskArgs) => {
    try {
      if (!taskArgs.task && !taskArgs.taskspecname)
        throw Error("Must either submit taskspecnamne or task object");
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        read: true,
      });

      let taskSpec;
      if (taskArgs.task) {
        let conditionAddresses = [];
        for (const condition of taskArgs.task.conditions) {
          conditionAddresses.push(condition.inst);
        }
        // conditions, actions, autoSubmitNextTask, gasPriceCeil
        taskSpec = new TaskSpec({
          conditions: conditionAddresses,
          actions: taskArgs.task.actions,
          autoSubmitNextTask: taskArgs.task.autoSubmitNextTask,
          gasPriceCeil: 0,
        });
      } else if (taskArgs.taskspecname) {
        taskSpec = await run(`gc-return-taskspec-${taskArgs.taskspecname}`);
      }

      // 2. Hash Task Spec
      const taskSpecHash = await gelatoCore.hashTaskSpec(taskSpec);

      // Check if taskSpecHash's gasPriceCeil is != 0
      const isProvided = await gelatoCore.taskSpecGasPriceCeil(
        taskArgs.provider,
        taskSpecHash
      );

      // Revert if task spec is not provided
      if (isProvided == 0) {
        // await gelatoCore.provideTaskSpecs([taskSpec]);
        if (taskArgs.log)
          console.log(
            `Task Spec is not provided by provider: ${taskArgs.provider}. Please provide it by running the gc-providetaskspec script`
          );
        return false;
      } else {
        if (taskArgs.log) console.log("Task spec provided ✅");
        return true;
      }
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
