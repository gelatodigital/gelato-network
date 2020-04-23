class TaskReceipt {
  constructor({ id, userProxy, task }) {
    if (id === undefined) throw new Error("TaskReceipt: no id");
    if (userProxy === undefined) throw new Error("TaskReceipt: no userProxy");
    if (task === undefined) throw new Error("TaskReceipt: no Task object");

    this.id = id;
    this.userProxy = userProxy;
    this.task = task;
  }
}

export default TaskReceipt;
