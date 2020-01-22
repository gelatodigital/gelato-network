// ======= Default Payloads ========
// === Triggers ===
// TriggerMinBalanceIncrease
import "./default_payloads/triggers/sTask.defaultpayload.TriggerBalance";
// TriggerTimestampPassed
import "./default_payloads/triggers/sTask.defaultpayload.TriggerTimestampPassed";
// == Kyber ==
import "./default_payloads/triggers/sTask.defaultpayload.TriggerKyberRateKovan";
import "./default_payloads/triggers/sTask.defaultpayload.RopstenTriggerKyberRate";

// === Actions ==
// ActionBzxPtokenMintWithToken
import "./default_payloads/actions/sTask.defaultpayload.ActionBzxPtokenBurnToToken";
// ActionBzxPtokenMintWithToken
import "./default_payloads/actions/sTask.defaultpayload.ActionBzxPtokenMintWithToken";
// ActionERC20Transfer
import "./default_payloads/actions/sTask.defaultpayload.ActionERC20Transfer";
// ActionERC20TransferFrom
import "./default_payloads/actions/sTask.defaultpayload.ActionERC20TransferFrom";
// ActionKyberTrade
import "./default_payloads/actions/sTask.defaultpayload.KovanActionKyberTrade";
import "./default_payloads/actions/sTask.defaultpayload.RopstenActionKyberTrade";
// ActionMultiMintForTriggerTimestampPassed
import "./default_payloads/actions/sTask.defaultpayload.ActionMultiMintForTriggerTimestampPassed";
