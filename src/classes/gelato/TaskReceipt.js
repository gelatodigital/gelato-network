import { constants, utils } from "ethers";

class TaskReceipt {
  constructor({ id, userProxy, task, index, expiryDate, rounds, cycle }) {
    if (userProxy === undefined) throw new Error("TaskReceipt: no userProxy");
    if (rounds === undefined) throw new Error("TaskReceipt: no Rounds");
    // if (index !== undefined) index = utils.bigNumberify(index);
    if (cycle && !Array.isArray(cycle))
      throw new Error("\nTask: cycle be non-empty Array\n");
    if (cycle !== undefined) for (const task of cycle) _checkTaskMembers(task);

    this.id = id !== undefined ? utils.bigNumberify(id) : constants.Zero;
    this.userProxy = userProxy;
    this.index =
      index === undefined ? utils.bigNumberify("0") : utils.bigNumberify(index);
    this.expiryDate = expiryDate ? expiryDate : constants.Zero;
    this.rounds = rounds;
    this.cycle = cycle ? cycle : [];
  }
}

async function _checkTaskMembers(task) {
  if (!task.provider) throw new Error("\nTask: no provider\n");
  if (task.conditions && !Array.isArray(task.conditions))
    throw new Error("\nTask: optional conditions must be non-empty Array\n");
  if (!task.actions || !Array.isArray(task.actions) || !task.actions.length)
    throw new Error("\nTask: task.actions must be non-empty Array\n");
}

export default TaskReceipt;
