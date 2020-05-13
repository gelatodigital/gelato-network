import { constants } from "ethers";
import checkTaskMembers from "../../helpers/gelato/checkTaskMembers";

class StandaloneTaskSequence {
  constructor({ taskSequence, countdown, expiryDate }) {
    if (!taskSequence || !Array.isArray(taskSequence))
      throw new Error("\nTask: taskSequence must be Array\n");
    if (!taskSequence.length)
      throw new Error("\nTask: taskSequence be non-empty Array\n");
    for (const task of taskSequence) checkTaskMembers(task);
    this.taskSequence = taskSequence;
    this.countdown = countdown === undefined ? 1 : countdown;
    this.expiryDate = expiryDate ? expiryDate : constants.AddressZero;
  }
}

export default StandaloneTaskSequence;
