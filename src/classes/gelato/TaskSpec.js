// TaskSpec
class TaskSpec {
  constructor({ conditions, actions, autoSubmitNextTask, gasPriceCeil }) {
    if (conditions && (!Array.isArray(conditions) || !conditions.length))
      throw new Error(
        "\nTaskSpec: optional conditions must be non-empty Array\n"
      );
    if (!actions || !Array.isArray(actions) || !actions.length)
      throw new Error("\nTaskSpec: actions must be non-empty Array\n");
    if (gasPriceCeil === undefined)
      throw new Error("\n TaskSpec: no gasPriceCeil passed to constructor \n ");

    if (autoSubmitNextTask && typeof autoSubmitNextTask !== "boolean") {
      throw new Error(
        "\nTask: autoSubmitNextTask must be boolean if defined\n"
      );
    }
    this.conditions = conditions ? conditions : [];
    this.actions = actions;
    this.autoSubmitNextTask = autoSubmitNextTask ? true : false;
    this.gasPriceCeil = gasPriceCeil;
  }
}

export default TaskSpec;
