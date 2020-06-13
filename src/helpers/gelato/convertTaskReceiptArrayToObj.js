import Action from "../../classes/gelato/Action";
import Condition from "../../classes/gelato/Condition";
import GelatoProvider from "../../classes/gelato/GelatoProvider";
import Task from "../../classes/gelato/Task";
import TaskReceipt from "../../classes/gelato/TaskReceipt";

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
const DATA_PIPE = 3;
const VALUE = 4;
const TERMS_OK_CHECK = 5;

// Task
const CONDITIONS = 0;
const ACTIONS = 1;
const SELF_PROVIDER_GAS_LIMIT = 2;
const SELF_PROVIDER_GAS_PRICE_CEIL = 3;

// TaskReceipt
const ID = 0;
const USER_PROXY = 1;
const PROVIDER = 2;
const INDEX = 3;
const TASKS = 4;
const EXPIRY_DATE = 5;
const CYCLE_ID = 6;
const SUBMISSIONS_LEFT = 7;

function convertTaskReceiptArrayToObj(taskReceiptArray) {
  const tasks = _convertToArrayOfTaskObjs(taskReceiptArray[TASKS]);

  const taskReceiptObj = new TaskReceipt({
    id: taskReceiptArray[ID],
    userProxy: taskReceiptArray[USER_PROXY],
    provider: _convertToProviderObj(taskReceiptArray[PROVIDER]),
    index: taskReceiptArray[INDEX],
    tasks: tasks ? tasks : [],
    expiryDate: taskReceiptArray[EXPIRY_DATE],
    cycleId: taskReceiptArray[CYCLE_ID],
    submissionsLeft: taskReceiptArray[SUBMISSIONS_LEFT],
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

function _convertToArrayOfTaskObjs(tasksLog) {
  const tasks = [];
  for (let task of tasksLog) {
    task = new Task({
      conditions: _convertToArrayOfConditionObjs(task[CONDITIONS]),
      actions: _convertToArrayOfActionObjs(task[ACTIONS]),
      selfProviderGasLimit: task[SELF_PROVIDER_GAS_LIMIT],
      selfProviderGasPriceCeil: task[SELF_PROVIDER_GAS_PRICE_CEIL],
    });
    tasks.push(task);
  }
  return tasks;
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
      dataFlow: action[DATA_PIPE],
      value: action[VALUE],
      termsOkCheck: action[TERMS_OK_CHECK],
    });
    actions.push(action);
  }
  return actions;
}

export default convertTaskReceiptArrayToObj;
