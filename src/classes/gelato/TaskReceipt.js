import { constants, utils } from "ethers";
import checkTaskMembers from "../../helpers/gelato/checkTaskMembers";

class TaskReceipt {
  constructor({ id, userProxy, index, tasks, countdown, expiryDate }) {
    if (userProxy === undefined) throw new Error("TaskReceipt: no userProxy");
    if (!tasks || !Array.isArray(tasks))
      throw new Error("\nTask: tasks must be Array\n");
    if (!tasks.length) throw new Error("\nTask: tasks be non-empty Array\n");
    for (const task of tasks) checkTaskMembers(task);

    this.id = id !== undefined ? utils.bigNumberify(id) : constants.Zero;
    this.userProxy = userProxy;
    this.index =
      index === undefined ? constants.Zero : utils.bigNumberify(index);
    this.tasks = tasks ? tasks : [];
    this.countdown = countdown === undefined ? 1 : countdown;
    this.expiryDate = expiryDate ? expiryDate : constants.Zero;
  }
}

export default TaskReceipt;
