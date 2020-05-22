import { task } from "@nomiclabs/buidler/config";

export default task(
  "gelato-check-if-provided",
  `Checks if task spec is whitelisted by given provider on gelato core`
)
  .addOptionalParam(
    "provider",
    "address of provider who should have provided the task spec"
  )
  .addOptionalParam("task", "the task object - not possible through cli")
  .addOptionalParam(
    "taskspecname",
    "name of default task spec found in dapps folder"
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async (taskArgs) => {
    try {
      if (!taskArgs.task && !taskArgs.taskspecname)
        throw Error("Must either submit taskspecnamne or task object");

      if (!taskArgs.provider) {
        const provider = getProvider();
        taskArgs.provider = await provider.getAddress();
      }
      const gelatoCore = await run("instantiateContract", {
        deployments: true,
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
          conditions:
            conditionAddresses.length > 0 ? conditionAddresses : undefined,
          actions: taskArgs.task.actions,
          autoSubmitNextTask: taskArgs.task.autoSubmitNextTask,
          gasPriceCeil: 0,
        });
      } else if (taskArgs.taskspecname) {
        taskSpec = await run(`gelato-return-taskspec-${taskArgs.taskspecname}`);
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
        throw Error(
          `
          \n❌ Task Spec is not provided by provider: ${taskArgs.provider}
          \n❌ Please provide it by running: >> npx buidler gelato-whitelist-taskspec ${taskArgs.taskspecname} --network ${network.name}\n`
        );
      } else {
        if (taskArgs.log) console.log("Task spec provided ✅");
        return true;
      }
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
