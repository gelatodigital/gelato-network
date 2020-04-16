class ExecClaim {
  constructor({ id, userProxy, task }) {
    if (id === undefined) throw new Error("ExecClaim: no id");
    if (userProxy === undefined) throw new Error("ExecClaim: no userProxy");
    if (task === undefined) throw new Error("ExecClaim: no Task object");

    this.id = id;
    this.userProxy = userProxy;
    this.task = task;
  }
}

export default ExecClaim;
