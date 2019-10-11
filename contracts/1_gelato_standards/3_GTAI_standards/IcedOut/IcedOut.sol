pragma solidity ^0.5.10;

import '../../../2_gelato_core/GelatoCore.sol';
import '../../../0_gelato_interfaces/1_GTA_interfaces/gelato_action_interfaces/IGelatoAction.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';

contract IcedOut {
     using SafeMath for uint256;

     GelatoCore internal gelatoCore;
     address payable internal selectedExecutor;
     uint256 internal gtaiGasPrice;

     function getGelatoCore() external view returns(address) {
          return address(gelatoCore);
     }
     function getSelectedExecutor() external view returns(address payable) {
          return selectedExecutor;
     }
     function getGTAIGasPrice() external view returns(uint256) {
          return gtaiGasPrice;
     }

     constructor(address payable _gelatoCore,
                 uint256 _gtaiGasPrice
     )
          internal
     {
          gelatoCore = GelatoCore(_gelatoCore);
          gtaiGasPrice = _gtaiGasPrice;
     }

     // _________________ ExecutionClaim Expiration Time ____________________
     event LogSelectedExecutorUpdated(address payable oldExecutor,
                                      address payable newExecutor
     );
     function _selectExecutor(address payable _executor)
          internal
     {
          emit LogSelectedExecutorUpdated(selectedExecutor, _executor);
          selectedExecutor = _executor;
     }
     // =========================

     // _________________ ExecutionClaim Pricing ____________________________
     function _getExecutionGasEstimate(address _action)
          internal
          view
          returns(uint256 executionGasEstimate)
     {
          uint256 gasOutsideGasLeftChecks = gelatoCore.gasOutsideGasleftChecks();
          uint256 gasInsideGasLeftChecks = gelatoCore.gasInsideGasleftChecks();
          uint256 actionGasStipend = IGelatoAction(_action).getActionGasStipend();
          uint256 executorGasRefundEstimate = gelatoCore.executorGasRefundEstimate();
          executionGasEstimate
               = (gasOutsideGasLeftChecks.add(gasInsideGasLeftChecks)
                                         .add(gasInsideGasLeftChecks)
                                         .add(actionGasStipend)
                                         .sub(executorGasRefundEstimate)
          );
     }

     function _getExecutionClaimPrice(address _action)
          internal
          view
          returns(uint256 executionClaimPrice)
     {
          uint256 executionGasEstimate = _getExecutionGasEstimate(_action);
          uint256 executorProfit = gelatoCore.executorProfit();
          executionClaimPrice = (executionGasEstimate.mul(gtaiGasPrice)
                                                     .add(executorProfit)
          );
     }

     event LogGTAIGasPriceUpdated(uint256 oldGTAIGasPrice,
                                  uint256 newGTAIGasPrice
     );
     function _setGTAIGasPrice(uint256 _gtaiGasPrice)
          internal
     {
          emit LogGTAIGasPriceUpdated(gtaiGasPrice, _gtaiGasPrice);
          gtaiGasPrice = _gtaiGasPrice;
     }
     // =========================


     // _________________ ExecutionClaim Minting ____________________________
     function _mintExecutionClaim(address _user,
                                  address _trigger,
                                  bytes memory _triggerPayload,
                                  address _action,
                                  bytes memory _actionPayload,
                                  uint256 _executionClaimLifespan
     )
          internal
          returns(bool)
     {
          gelatoCore.mintExecutionClaim(_user,
                                        _trigger,
                                        _triggerPayload,
                                        _action,
                                        _actionPayload,
                                        _executionClaimLifespan
          );
          return true;
     }

     function _getCurrentExecutionClaimId()
          internal
          view
          returns(uint256)
     {
          return gelatoCore.getCurrentExecutionClaimId();
     }
     // =========================

     // _________________ Interface Funding Flows ____________________________
     function _getGTAIBalanceRequirement()
          internal
          view
          returns(uint256 gtaiBalanceRequirement)
     {
          gtaiBalanceRequirement
               = gelatoCore.getGTAIBalanceRequirement(address(this));
     }

     // _______________ Top Up __________________________________
     // ___________ GelatoInterface <-- EOA ___________
     function acceptEther()
          external
          payable
     {}
     // ___________ GelatoCore <--> Interface ___________
     event LogGTAIBalanceTopUp(uint256 amount,
                               uint256 thisBalancePost,
                               uint256 thisBalance
     );
     function _topUpBalanceOnGelato(uint256 _amount)
          internal
     {
          gelatoCore.addGTAIBalance.value(_amount)();
          emit LogGTAIBalanceTopUp(msg.value,
                                   gelatoCore.gtaiBalances(address(this)),
                                   address(this).balance
          );
     }
     // _______________ Withdraw __________________________________
     event LogBalanceWithdrawnFromGelato(uint256 amount,
                                         uint256 gtaiBalancePost,
                                         uint256 thisBalancePost
     );
     function _withdrawBalanceFromGelato(uint256 _withdrawAmount)
          internal
     {
          gelatoCore.withdrawGTAIBalance(_withdrawAmount);
          emit LogBalanceWithdrawnFromGelato(_withdrawAmount,
                                             gelatoCore.gtaiBalances(address(this)),
                                             address(this).balance
          );
     }
     // ___________ Interface --> EOA ___________
     event LogBalanceWithdrawnToSender(uint256 withdrawAmount,
                                       uint256 thisBalancePost,
                                       uint256 senderBalancePost
     );
     function _withdrawBalanceToSender(uint256 _withdrawAmount)
          internal
     {
          require(address(this).balance >= _withdrawAmount,
               "IcedOut.withdrawBalanceToSender: _withdrawAmount > balance"
          );
          msg.sender.transfer(_withdrawAmount);
          emit LogBalanceWithdrawnToSender(_withdrawAmount,
                                           address(this).balance,
                                           msg.sender.balance
          );
     }
     // ___________ GelatoCore --> Interface --> EOA ___________
     function _withdrawBalanceFromGelatoToSender(uint256 _withdrawAmount)
          internal
     {
          _withdrawBalanceFromGelato(_withdrawAmount);
          _withdrawBalanceToSender(_withdrawAmount);
     }
     // =========================
}