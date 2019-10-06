pragma solidity ^0.5.10;

import '../../../gelato_core/GelatoCore.sol';
import '../../../GTA/gelato_actions/gelato_action_standards/IGelatoAction.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';

contract IcedOut {
     using SafeMath for uint256;

     GelatoCore public gelatoCore;
     uint256 public executionClaimLifespan;
     uint256 public gtaiGasPrice;
     uint256 public automaticTopUpAmount;

     constructor(address payable _gelatoCore,
                 uint256 _executionClaimLifespan,
                 uint256 _gtaiGasPrice,
                 uint256 _automaticTopUpAmount
     )
          internal
     {
          gelatoCore = GelatoCore(_gelatoCore);
          executionClaimLifespan = _executionClaimLifespan;
          gtaiGasPrice = _gtaiGasPrice;
          automaticTopUpAmount = _automaticTopUpAmount;
     }

     // _________________ ExecutionClaim Expiration Time ____________________
     event LogExecutionClaimLifespanUpdate(uint256 _oldLifespan,
                                           uint256 _newLifespan
     );
     function _setExecutionClaimLifespan(uint256 _lifespan)
          internal
     {
          emit LogExecutionClaimLifespanUpdate(executionClaimLifespan, _lifespan);
          executionClaimLifespan = _lifespan;
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
          uint256 actionGasStipend = IGelatoAction(_action).actionGasStipend();
          uint256 executorGasRefundEstimate = gelatoCore.executorGasRefundEstimate();
          executionGasEstimate
               = (gasOutsideGasLeftChecks.add(gasInsideGasLeftChecks)
                                         .add(gasInsideGasLeftChecks)
                                         .add(actionGasStipend)
                                         .sub(executorGasRefundEstimate)
          );
     }
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
          uint256 executionGasEstimate = _getExecutionGasEstimate(_action);
          uint256 executorProfit = gelatoCore.executorProfit();
          executionClaimPrice = (executionGasEstimate.mul(gasPriceHedge)
                                                     .add(executorProfit)
          );
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
     function _getCurrentExecutionClaimId()
          internal
          view
          returns(uint256)
     {
          return gelatoCore.getCurrentExecutionClaimId();
     }

     function _mintExecutionClaim(address _executionClaimOwner,
                                  address _trigger,
                                  bytes memory _triggerPayload,
                                  address _action,
                                  bytes memory _actionPayload,
                                  uint256 _executionClaimLifespan
     )
          internal
     {
          uint256 executionClaimMintingDeposit
               = gelatoCore.getExecutionClaimMintingDeposit(_action);
          require(gelatoCore.mintExecutionClaim
                            .value(executionClaimMintingDeposit)
                            (_executionClaimOwner,
                             _trigger,
                             _triggerPayload,
                             _action,
                             _actionPayload,
                             _executionClaimLifespan),
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
          public
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