/*
struct Provider {
    address addr;  //  if msg.sender == provider => self-Provider
    IGelatoProviderModule module;  //  can be IGelatoProviderModule(0) for self-Providers
}

struct Condition {
    IGelatoCondition inst;  // can be AddressZero for self-conditional Actions
    bytes data;  // can be bytes32(0) for self-conditional Actions
}

enum Operation { Call, Delegatecall }

struct Action {
    address addr;
    bytes data;
    Operation operation;
    uint256 value;
    bool termsOkCheck;
}


struct TaskReceipt {
    uint256 id;
    address userProxy;
    Task task;
}
 */

function convertTaskReceiptObjToArray(taskReceiptObj) {
  const provider = _convertToProviderArray(taskReceiptObj.task.provider);

  const conditions = _convertToArrayOfConditionArrays(
    taskReceiptObj.task.conditions
  );

  const actions = _convertToArrayOfActionArrays(taskReceiptObj.task.actions);

  const task = [
    provider,
    conditions,
    actions,
    taskReceiptObj.task.expiryDate,
    taskReceiptObj.task.autoResubmitSelf,
  ];

  const cycle = _convertToArrayOfTaskArrays(taskReceiptObj.cycle);

  const taskReceiptArray = [
    taskReceiptObj.id,
    taskReceiptObj.userProxy,
    task,
    taskReceiptObj.next,
    cycle,
  ];

  return taskReceiptArray;
}

function _convertToProviderArray(providerObj) {
  const providerArray = [providerObj.addr, providerObj.module];
  return providerArray;
}

function _convertToArrayOfConditionArrays(arrayOfConditionObjs) {
  const conditions = [];
  for (const conditionObj of arrayOfConditionObjs) {
    const conditionArray = [conditionObj.inst, conditionObj.data];
    conditions.push(conditionArray);
  }
  return conditions;
}

function _convertToArrayOfActionArrays(arrayOfActionObjs) {
  const actions = [];
  for (const actionObj of arrayOfActionObjs) {
    const actionArray = [
      actionObj.addr,
      actionObj.data,
      actionObj.operation,
      actionObj.value,
      actionObj.termsOkCheck,
    ];
    actions.push(actionArray);
  }
  return actions;
}

function _convertToArrayOfTaskArrays(arrayOfTaskObjs) {
  const tasks = [];
  for (const taskObj of arrayOfTaskObjs) {
    const taskArray = [
      _convertToProviderArray(taskObj.provider),
      _convertToArrayOfConditionArrays(taskObj.conditions),
      _convertToArrayOfActionArrays(taskObj.actions),
      taskObj.expiryDate,
      taskObj.autoResubmitSelf,
    ];
    tasks.push(taskArray);
  }
  return tasks;
}

export default convertTaskReceiptObjToArray;
