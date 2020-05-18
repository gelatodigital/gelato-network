// TaskSpec
class TaskSpec {
  constructor({ conditions, actions, gasPriceCeil }) {
    if (conditions && (!Array.isArray(conditions) || !conditions.length))
      throw new Error(
        "\nTaskSpec: optional conditions must be non-empty Array\n"
      );
    if (!actions || !Array.isArray(actions) || !actions.length)
      throw new Error("\nTaskSpec: actions must be non-empty Array\n");
    if (gasPriceCeil === undefined)
      throw new Error("\n TaskSpec: no gasPriceCeil passed to constructor \n ");

    this.conditions = conditions ? conditions : [];
    this.actions = actions;
    this.gasPriceCeil = gasPriceCeil;
  }
}

export default TaskSpec;
