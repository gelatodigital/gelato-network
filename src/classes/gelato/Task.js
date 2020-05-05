

class Task {
  constructor({ taskBase, cycle }) {
    if (!taskBase) throw new Error("\nTask: no taskBase provided\n");
    if (cycle && (!Array.isArray(cycle) || !taskBase.cycle.length))
      throw new Error("\nTask: cycle be non-empty Array\n");

    _checkTaskBaseMembers(taskBase);
    if (cycle)
      for (const _taskBase of cycle) _checkTaskBaseMembers(_taskBase);

    this.taskBase = taskBase;
    this.next = 0;
    this.cycle = cycle ? cycle : [];
  }
}

function _checkTaskBaseMembers(taskBase) {
  if (!taskBase.provider) throw new Error("\nTask: no provider\n");
  if (
    taskBase.conditions &&
    (!Array.isArray(taskBase.conditions) || !taskBase.conditions.length)
  )
    throw new Error("\nTask: optional conditions must be non-empty Array\n");
  if (
    !taskBase.actions ||
    !Array.isArray(taskBase.actions) ||
    !taskBase.actions.length
  )
    throw new Error("\nTask: taskBase.actions must be non-empty Array\n");
  if (
    taskBase.autoResubmitSelf &&
    typeof taskBase.autoResubmitSelf !== "boolean"
  ) {
    throw new Error(
      "\nTask: taskBase.autoResubmitSelf must be boolean if defined\n"
    );
  }
}

export default Task;
