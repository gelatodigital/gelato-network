pragma solidity ^0.5.10;

import '../../gelato_core/GelatoCore.sol';
import '../../GTA/gelato_actions/gelato_action_standards/IGelatoAction.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';

contract IcedOut {
     using SafeMath for uint256;

     GelatoCore public gelatoCore;
     uint256 public gtaiGasPrice;
     uint256 public automaticTopUpAmount;

     constructor(address payable _gelatoCore,
                 uint256 _gtaiGasPrice,
                 uint256 _automaticTopUpAmount
     )
          internal
     {
          gelatoCore = GelatoCore(_gelatoCore);
          gtaiGasPrice = _gtaiGasPrice;
          automaticTopUpAmount = _automaticTopUpAmount;
     }

     // _________________ ExecutionClaim Pricing ____________________________
     enum GasPricePrediction {
          GelatoDefault
     }
     function _getExecutionClaimPrice(address _action)
          internal
          view
          returns(uint256 executionClaimPrice)
     {
          uint256 gasPriceHedge;
          if (gtaiGasPrice == uint8(GasPricePrediction.GelatoDefault)) {
               gasPriceHedge = gelatoCore.defaultGasPriceForGTAIs();
          } else {
               gasPriceHedge = gtaiGasPrice;
          }
          uint256 actionGasStipend = IGelatoAction(_action).actionGasStipend();
          executionClaimPrice = actionGasStipend.mul(gasPriceHedge);
     }

     function _useGTAIGasPrice(uint256 _gtaiGasPrice)
          internal
     {
          require(_gtaiGasPrice != 0,
               "IcedOut.useInterfaceGasPrice: zero-value"
          );
          gtaiGasPrice = _gtaiGasPrice;
     }
     function _useGelatoDefaultGasPrice()
          internal
     {
          gtaiGasPrice = uint8(GasPricePrediction.GelatoDefault);
     }
     // =========================


     // _________________ ExecutionClaim Minting ____________________________
     function _getNextExecutionClaimId()
          internal
          view
          returns(uint256)
     {
          return gelatoCore.getCurrentExecutionClaimId().add(1);
     }

     function _mintExecutionClaim(uint256 _executionClaimId,
                                  address _executionClaimOwner,
                                  address _triggerAddress,
                                  bytes memory _triggerPayload,
                                  address _actionAddress,
                                  bytes memory _actionPayload,
                                  uint256 _actionGasStipend
     )
          internal
     {
          require(gelatoCore.mintExecutionClaim(_executionClaimId,
                                                _executionClaimOwner,
                                                _triggerAddress,
                                                _triggerPayload,
                                                _actionAddress,
                                                _actionPayload,
                                                _actionGasStipend),
               "IcedOut._mintExecutionClaim: failed"
          );
     }
     // =========================


     // _________________ Interface Funding Flows ____________________________
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
     function _topUpBalanceOnGelato()
          internal
          payable
     {
          gelatoCore.addGTAIBalance.value(msg.value)();
          emit LogGTAIBalanceTopUp(msg.value,
                                   gelatoCore.gtaiBalances(address(this)),
                                   address(this).balance
          );
     }
     // ___________ Automatic Top Up _______________________________________
     event LogNewAutomaticTopUpAmount(address indexed sender,
                                      uint256 oldAutomaticTopUpAmount,
                                      uint256 newAutomaticTopUpAmount
     );
     function _setAutomaticTopUpAmount(uint256 _newAmount)
          internal
     {
          emit LogNewAutomaticTopUpAmount(msg.sender,
                                          automaticTopUpAmount,
                                          _newAmount
          );
          automaticTopUpAmount = _newAmount;
     }
     function _automaticTopUp()
          internal
     {
          uint256 gtaiGelatoBalance = gelatoCore.gtaiBalances(address(this));
          if (gtaiGelatoBalance < gelatoCore.minGTAIBalance())
          {
               gelatoCore.addGTAIBalance.value(automaticTopUpAmount)();
               emit LogGTAIBalanceTopUp(automaticTopUpAmount,
                                        gelatoCore.gtaiBalances(address(this)),
                                        address(this).balance
               );
          }
     }
     // =========================

     // _______________ Withdraw __________________________________
     event LogBalanceWithdrawnFromGelato(uint256 amount,
                                         uint256 gtaiBalancePost,
                                         uint256 thisBalancePost
     );
     function _withdrawBalanceFromGelato(uint256 _withdrawAmount)
          internal
     {
          gelatoCore.withdrawInterfaceBalance(_withdrawAmount);
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