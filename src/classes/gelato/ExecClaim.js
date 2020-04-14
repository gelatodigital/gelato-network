import Task from "./Task";

class ExecClaim {
  constructor({ id, userProxy, taskObj }) {
    if (!id) throw new Error("ExecClaim: no id");
    if (!userProxy) throw new Error("ExecClaim: no userProxy");
    if (!taskObj) throw new Error("ExecClaim: no Task object");

    this.id = id;
    this.userProxy = userProxy;
    const task = new Task(taskObj);
    this.task = task;
  }
}

export default ExecClaim;
