class Task {
  constructor({ base, cycle }) {
    if (!base) throw new Error("\nTask: no base provided\n");
    if (cycle && (!Array.isArray(cycle) || !base.cycle.length))
      throw new Error("\nTask: cycle be non-empty Array\n");

    _checkTaskBaseMembers(base);
    if (cycle !== undefined)
      for (const _base of cycle) _checkTaskBaseMembers(_base);

    this.base = base;
    this.next = 0;
    this.cycle = cycle ? cycle : [];
  }
}

async function _checkTaskBaseMembers(base) {
  if (!base.provider) throw new Error("\nTask: no provider\n");
  if (base.conditions && !Array.isArray(base.conditions))
    throw new Error("\nTask: optional conditions must be non-empty Array\n");
  if (!base.actions || !Array.isArray(base.actions) || !base.actions.length)
    throw new Error("\nTask: base.actions must be non-empty Array\n");
  if (base.autoResubmitSelf && typeof base.autoResubmitSelf !== "boolean") {
    throw new Error(
      "\nTask: base.autoResubmitSelf must be boolean if defined\n"
    );
  }
}

export default Task;
