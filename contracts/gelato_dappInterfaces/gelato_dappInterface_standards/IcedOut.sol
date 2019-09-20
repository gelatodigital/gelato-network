pragma solidity ^0.5.10;

// Imports
import '../../gelato_core/GelatoCore.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';

contract IcedOut {
     using SafeMath for uint256;

     GelatoCore public gelatoCore;

     /// @dev: To adjust prePayment, use gasPrice
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

     // ___________ GasPrice ___________
     function _useInterfaceGasPrice(uint256 _interfaceGasPrice)
          internal
     {
          require(_interfaceGasPrice != 0,
               "IcedOut.useInterfaceGasPrice: zero-value"
          );
          interfaceGasPrice = _interfaceGasPrice;
     }
     function _useRecommendedGasPrice()
          internal
     {
          interfaceGasPrice = 0;
     }
     // ====================================================================

     // _________________ Interface Funding Flows _________________
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
     function withdrawBalanceFromGelato(uint256 _withdrawAmount)
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
     // ====================================================================


     // Mint new execution claims in core
     function mintExecutionClaim(address _triggerAddress,
                                 bytes memory _triggerPayload,
                                 address _actionAddress,
                                 bytes memory _actionPayload,
                                 uint256 _actionMaxGas,
                                 address _executionClaimSender
     )
          internal
     {
          /*
          address _triggerAddress,
                                bytes calldata _triggerPayload,
                                address _actionAddress,
                                bytes calldata _actionPayload,
                                uint256 _actionMaxGas,
                                address _executionClaimSender
          */
          // executionClaimId = gelatoCore.getCurrentExecutionClaimId().add(1)
          gelatoCore.mintExecutionClaim(_triggerAddress,
                                        _triggerPayload,
                                        _actionAddress,
                                        _actionPayload,
                                        _actionMaxGas,
                                        _executionClaimSender
          );
          // gelatoCore.mintExecutionClaim(payload, _user, _executionGas);
     }

     function getNextExecutionClaimId()
          internal
          view
          returns(uint256)
     {
          return gelatoCore.getCurrentExecutionClaimId().add(1);
     }


     // IF interface balance is below threshold on gelato Core,
     //  add all of the ETH in interface as new balance in gelato core
     function automaticTopUp()
          internal
     {
          // Fetch interface eth balance on gelato core
          uint256 interfaceGelatoBalance = gelatoCore.interfaceBalances(address(this));
          if (interfaceGelatoBalance < gelatoCore.minInterfaceBalance())
          {
               uint256 interfaceEthBalance = address(this).balance;
               gelatoCore.addInterfaceBalance.value(interfaceEthBalance)();
               emit LogToppedUpBalanceOnGelato(interfaceEthBalance,
                                               gelatoCore.interfaceBalances(address(this)),
                                               address(this).balance
               );
          }
     }
}