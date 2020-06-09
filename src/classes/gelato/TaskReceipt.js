import { constants, utils } from "ethers";
import checkTaskMembers from "../../helpers/gelato/checkTaskMembers";

class TaskReceipt {
  constructor({
    id,
    userProxy,
    provider,
    index,
    tasks,
    expiryDate,
    cycleId,
    submissionsLeft,
  }) {
    if (userProxy === undefined) throw new Error("TaskReceipt: no userProxy");
    if (!provider) throw new Error("TaskReceipt: no provider\n");
    if (!tasks || !Array.isArray(tasks))
      throw new Error("\nTask: tasks must be Array\n");
    if (!tasks.length) throw new Error("\nTask: tasks be non-empty Array\n");
    for (const task of tasks) checkTaskMembers(task);

    this.id = id !== undefined ? utils.bigNumberify(id) : constants.Zero;
    this.userProxy = userProxy;
    this.provider = provider;
    this.index =
      index === undefined ? constants.Zero : utils.bigNumberify(index);
    this.tasks = tasks ? tasks : [];
    this.expiryDate = expiryDate !== undefined ? expiryDate : constants.Zero;
    this.cycleId = cycleId !== undefined ? cycleId : constants.Zero;
    this.submissionsLeft = submissionsLeft === undefined ? 1 : submissionsLeft;
  }
}

export default TaskReceipt;
