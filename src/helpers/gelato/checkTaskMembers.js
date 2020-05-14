export default function checkTaskMembers(task) {
  if (task.conditions && !Array.isArray(task.conditions))
    throw new Error("\nTask: optional conditions must be non-empty Array\n");
  if (!task.actions || !Array.isArray(task.actions) || !task.actions.length)
    throw new Error("\nTask: task.actions must be non-empty Array\n");
}
