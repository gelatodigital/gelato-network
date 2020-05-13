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
const VALUE = 3;
const TERMS_OK_CHECK = 4;

// Task
const PROVIDER = 0;
const CONDITIONS = 1;
const ACTIONS = 2;

// TaskReceipt
const ID = 0;
const USER_PROXY = 1;
const INDEX = 2;
const TASKS = 3;
const COUNTDOWN = 4;
const EXPIRY_DATE = 5;

function convertTaskReceiptArrayToObj(taskReceiptArray) {
  const tasks = _convertToArrayOfTaskObjs(taskReceiptArray[TASKS]);

  const taskReceiptObj = new TaskReceipt({
    id: taskReceiptArray[ID],
    userProxy: taskReceiptArray[USER_PROXY],
    index: taskReceiptArray[INDEX],
    tasks: tasks ? tasks : [],
    countdown: taskReceiptArray[COUNTDOWN],
    expiryDate: taskReceiptArray[EXPIRY_DATE],
  });

  return taskReceiptObj;
}

function _convertToArrayOfTaskObjs(tasksLog) {
  const tasks = [];
  for (let task of tasksLog) {
    task = new Task({
      provider: _convertToProviderObj(task[PROVIDER]),
      conditions: _convertToArrayOfConditionObjs(task[CONDITIONS]),
      actions: _convertToArrayOfActionObjs(task[ACTIONS]),
    });
    tasks.push(task);
  }
  return tasks;
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


export default convertTaskReceiptArrayToObj;
