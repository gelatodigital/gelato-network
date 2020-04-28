class TaskReceipt {
  constructor({ id, userProxy, task }) {
    if (userProxy === undefined) throw new Error("TaskReceipt: no userProxy");
    if (task === undefined) throw new Error("TaskReceipt: no Task object");

    this.id = id !== undefined ? id : 0;
    this.userProxy = userProxy;
    this.task = task;
  }
}

export default TaskReceipt;
