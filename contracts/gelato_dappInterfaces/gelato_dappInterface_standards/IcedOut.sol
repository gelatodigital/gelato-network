pragma solidity ^0.5.10;

import '../../gelato_core/GelatoCore.sol';
import '../../GTA/GTA.sol';
import '../../GTA/gelato_triggers/gelato_trigger_standards/IGelatoTrigger.sol';
import '../../GTA/gelato_actions/gelato_action_standards/IGelatoAction.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';

contract IcedOut is {
     using SafeMath for uint256;

     GelatoCore public gelatoCore;
     uint256 public interfaceGasPrice;
     uint256 public automaticTopUpAmount;

     constructor(address payable _gelatoCore,
                 uint256 _interfaceGasPrice,
                 uint256 _automaticTopUpAmount
     )
          internal
     {
          gelatoCore = GelatoCore(_gelatoCore);
          interfaceGasPrice = _interfaceGasPrice;
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
          if (interfaceGasPrice == uint8(GasPricePrediction.GelatoDefault)) {
               gasPriceHedge = gelatoCore.defaultGasPriceForInterfaces();
          } else {
               gasPriceHedge = interfaceGasPrice;
          }
          uint256 actionGasStipend = IGelatoAction(_action).actionGasStipend();
          executionClaimPrice = actionGasStipend.mul(gasPriceHedge);
     }

     function _useInterfaceGasPrice(uint256 _interfaceGasPrice)
          internal
     {
          require(_interfaceGasPrice != 0,
               "IcedOut.useInterfaceGasPrice: zero-value"
          );
          interfaceGasPrice = _interfaceGasPrice;
     }
     function _useDefaultGasPrice()
          internal
     {
          interfaceGasPrice = uint8(GasPricePrediction.GelatoDefault);
     }
     // =========================


     // _________________ ExecutionClaim Minting ____________________________
     // Standard checks
     modifier matchingGelatoCore(address _gta) {
        require(GTA(_gta).matchingGelatoCore(address(gelatoCore)),
            "IcedOut.matchingGelatoCore: failed"
        );
        _;
     }
     modifier matchingTriggerSelector(address _trigger,
                                      bytes4 _triggerSelector)
     {
        require(IGelatoTrigger(_trigger).matchingTriggerSelector(_triggerSelector),
            "IcedOut.matchingTriggerSelector: failed"
        );
        _;
     }
     modifier matchingActionSelector(address _action,
                                     bytes4 _actionSelector)
     {
        require(IGelatoAction(_action).matchingActionSelector(_actionSelector),
            "IcedOut.matchingActionSelector: failed"
        );
        _;
     }
     // Optional checks
     modifier actionHasERC20Allowance(address _action,
                                      address _token,
                                      address _tokenOwner,
                                      uint256 _allowance)
     {
        require(IGelatoAction(_action).hasERC20Allowance(_token,
                                                         _tokenOwner,
                                                         _allowance),
            "IcedOut.actionHasERC20Allowance: failed"
        );
        _;
     }
     modifier actionConditionsFulfilled(bytes calldata _payload)
     {
        require(IGelatoAction(_action).conditionsFulfilled(_payload),
            "IcedOut.actionConditionsFulfilled: failed"
        );
        _;
     }

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
     // ___________ GelatoInterface <-- EOA ___________
     function acceptEther()
          external
          payable
     {}
     // ___________ GelatoCore <--> Interface ___________
     event LogToppedUpBalanceOnGelato(uint256 amount,
                                      uint256 gelatoBalancePost,
                                      uint256 interfaceBalancePost
     );
     function _topUpBalanceOnGelato()
          internal
          payable
     {
          gelatoCore.addInterfaceBalance.value(msg.value)();
          emit LogToppedUpBalanceOnGelato(msg.value,
                                          gelatoCore.interfaceBalances(address(this)),
                                          address(this).balance
          );
     }

     event LogBalanceWithdrawnFromGelato(uint256 amount,
                                         uint256 gelatoBalancePost,
                                         uint256 interfaceBalancePost
     );
     function _withdrawBalanceFromGelato(uint256 _withdrawAmount)
          internal
     {
          gelatoCore.withdrawInterfaceBalance(_withdrawAmount);
          emit LogBalanceWithdrawnFromGelato(_withdrawAmount,
                                             gelatoCore.interfaceBalances(address(this)),
                                             address(this).balance
          );
     }
     // ___________ Interface --> EOA ___________
     event LogBalanceWithdrawnToSender(uint256 withdrawAmount,
                                       uint256 interfaceBalancePost,
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


     // ___________ Automatic Top Up _______________________________________
     event LogNewAutomaticTopUpAmount(address indexed sender,
                                      uint256 oldAutomaticTopUpAmount,
                                      uint256 newAutomaticTopUpAmount,
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
          uint256 interfaceGelatoBalance = gelatoCore.interfaceBalances(address(this));
          if (interfaceGelatoBalance < gelatoCore.minInterfaceBalance())
          {
               gelatoCore.addInterfaceBalance.value(automaticTopUpAmount)();
               emit LogToppedUpBalanceOnGelato(interfaceEthBalance,
                                               gelatoCore.interfaceBalances(address(this)),
                                               address(this).balance
               );
          }
     }
     // =========================
}