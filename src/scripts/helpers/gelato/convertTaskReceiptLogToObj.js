import Action from "../../../classes/gelato/Action";
import Condition from "../../../classes/gelato/Condition";
import GelatoProvider from "../../../classes/gelato/GelatoProvider";
import Task from "../../../classes/gelato/Task";
import TaskBase from "../../../classes/gelato/TaskBase";
import TaskReceipt from "../../../classes/gelato/TaskReceipt";

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

struct TaskBase {
    Provider provider;
    Condition[] conditions;  // optional
    Action[] actions;
    uint256 expiryDate;  // 0 == infinity.
    bool autoResubmitSelf;
}

struct Task {
    TaskBase base;
    uint256 next; // optional for cyclic tasks: auto-filled by multiSubmitTask()
    TaskBase[] cycle;  // optional for cyclic tasks: auto-filled multiSubmitTasks()
}

struct TaskReceipt {
    uint256 id;
    address userProxy;
    Task task;
}
 */

// Provider
const PROVIDER_ADDR = 0;
const PROVIDER_MODULE = 1;

// Condition
const CONDITION_INST = 0;
const CONDITION_DATA = 1;

// Action
const ACTION_ADDR = 0;
const ACTION_DATA = 1;
const OPERATION = 2;
const VALUE = 3;
const TERMS_OK_CHECK = 4;

// TaskBase
const PROVIDER = 0;
const CONDITIONS = 1;
const ACTIONS = 2;
const EXPIRY_DATE = 3;
const AUTO_RESUBMIT_SELF = 4;

// Task
const BASE = 0;
const NEXT = 1;
const CYCLE = 2;

// TaskReceipt
const ID = 0;
const USER_PROXY = 1;
const TASK = 2;

function convertTaskReceiptArrayToObj(taskReceiptArray) {
  const provider = _convertToProviderObj(
    taskReceiptArray[TASK][BASE][PROVIDER]
  );

  const conditions = _convertToArrayOfConditionObjs(
    taskReceiptArray[TASK][BASE][CONDITIONS]
  );

  const actions = _convertToArrayOfActionObjs(
    taskReceiptArray[TASK][BASE][ACTIONS]
  );

  const base = new TaskBase({
    provider,
    conditions,
    actions,
    expiryDate: taskReceiptArray[TASK][BASE][EXPIRY_DATE],
    autoResubmitSelf: taskReceiptArray[TASK][BASE][AUTO_RESUBMIT_SELF],
  });

  const cycle = _convertToArrayOfTaskBaseObjs(taskReceiptArray[TASK][CYCLE]);

  const task = new Task({
    base,
    next: taskReceiptArray[TASK][NEXT],
    cycle,
  });

  const taskReceiptObj = new TaskReceipt({
    id: taskReceiptArray[ID],
    userProxy: taskReceiptArray[USER_PROXY],
    task,
  });

  return taskReceiptObj;
}

function _convertToProviderObj(providerLog) {
  const provider = new GelatoProvider({
    addr: providerLog[PROVIDER_ADDR],
    module: providerLog[PROVIDER_MODULE],
  });
  return provider;
}

function _convertToArrayOfConditionObjs(conditionsLog) {
  const conditions = [];
  for (let condition of conditionsLog) {
    condition = new Condition({
      inst: condition[CONDITION_INST],
      data: condition[CONDITION_DATA],
    });
    conditions.push(condition);
  }
  return conditions;
}

function _convertToArrayOfActionObjs(actionsLog) {
  const actions = [];
  for (let action of actionsLog) {
    action = new Action({
      addr: action[ACTION_ADDR],
      data: action[ACTION_DATA],
      operation: action[OPERATION],
      value: action[VALUE],
      termsOkCheck: action[TERMS_OK_CHECK],
    });
    actions.push(action);
  }
  return actions;
}

function _convertToArrayOfTaskBaseObjs(cycleLog) {
  const taskBases = [];
  for (let taskBase of cycleLog) {
    taskBase = new TaskBase({
      provider: _convertToProviderObj(taskBase[PROVIDER]),
      conditions: _convertToArrayOfConditionObjs(taskBase[CONDITIONS]),
      actions: _convertToArrayOfActionObjs(taskBase[ACTIONS]),
      expiryDate: taskBase[EXPIRY_DATE],
      autoResubmitSelf: taskBase[AUTO_RESUBMIT_SELF],
    });
    taskBases.push(taskBase);
  }
  return taskBases;
}

export default convertTaskReceiptArrayToObj;
