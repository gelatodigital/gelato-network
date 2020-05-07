import { constants, utils } from "ethers";

class TaskReceipt {
  constructor({ id, userProxy, task }) {
    if (userProxy === undefined) throw new Error("TaskReceipt: no userProxy");
    if (task === undefined) throw new Error("TaskReceipt: no Task object");

    this.id = id !== undefined ? utils.bigNumberify(id) : constants.Zero;
    this.userProxy = userProxy;
    this.task = task;
  }
}

export default TaskReceipt;
