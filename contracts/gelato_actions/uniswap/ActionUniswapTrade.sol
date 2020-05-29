// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.8;

import "../../external/IERC20.sol";
// import "../../external/SafeERC20.sol";
import "../../dapp_interfaces/uniswap/IUniswapExchange.sol";
import "../../dapp_interfaces/uniswap/IUniswapFactory.sol";
import "../../external/SafeMath.sol";
import "../../external/Address.sol";
import { IGelatoAction } from "../IGelatoAction.sol";
import { GelatoActionsStandard } from "../GelatoActionsStandard.sol";


contract ActionUniswapTrade is GelatoActionsStandard {
    using SafeMath for uint256;
    using Address for address;

    address public constant ETH_ADDRESS = address(
        0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
    );

    IUniswapFactory public immutable UNI_FACTORY;

    constructor(address _uniswapFactory) public {
        UNI_FACTORY = IUniswapFactory(_uniswapFactory);
    }

    function action(
        address _user, //"receiver"
        address _sendToken, // exchange
        uint256 _sendAmt, // tokens_sold
        address _receiveToken // token_addr
    )
        external
        virtual
    {

        uint256 returnAmount;
        address destinationAddress;

        // If sendToken is not ETH
        if (_sendToken != ETH_ADDRESS) {

            IERC20 sendERC20 = IERC20(_sendToken);

            IUniswapExchange sendTokenExchange = UNI_FACTORY.getExchange(sendERC20);

            try sendERC20.transferFrom(_user, address(this), _sendAmt) {} catch {
                revert("Error Transfer SendToken From User");
            }

            if (sendTokenExchange != IUniswapExchange(0)) {
                try sendERC20.approve(address(sendTokenExchange), _sendAmt) {}
                catch {
                    revert("Error Approve Uniswap");
                }

                if (_receiveToken != ETH_ADDRESS)
                {
                    // !! Dapp Interaction !!
                    try sendTokenExchange.tokenToTokenTransferInput(
                        _sendAmt,
                        1,
                        1,
                        block.timestamp,
                        _user,
                        _receiveToken
                    )
                    returns (uint256 returnEthAmount)
                    {
                        returnAmount = returnEthAmount;
                    }
                    catch {
                        revert("Error tokenToTokenTransferInput");
                    }
                }
                else
                {
                    // !! Dapp Interaction !!
                    try sendTokenExchange.tokenToEthTransferInput(
                        _sendAmt,
                        1,
                        block.timestamp,
                        _user
                    )
                        returns (uint256 returnEthAmount)
                    {
                        returnAmount = returnEthAmount;
                        destinationAddress = ETH_ADDRESS;
                    }
                    catch {
                        revert("Error tokenToEthTransferInput");
                    }
                }
            } else
            {
                revert("Error SendTokenExchange does not exist");
            }

        // If sendToken is ETH
        } else
        {
           (destinationAddress, returnAmount) = swapEthToToken(_receiveToken, _sendAmt, _user);
        }

    }

    function swapEthToToken(address _receiveToken, uint256 _sendAmount, address _user)
        internal
        returns (address, uint256)
    {
        IERC20 receiveERC20 = IERC20(_receiveToken);
        IUniswapExchange receiveTokenExchange = UNI_FACTORY.getExchange(receiveERC20);
        if (receiveTokenExchange != IUniswapExchange(0)) {
            // !! Dapp Interaction !!
            try receiveTokenExchange.ethToTokenTransferInput{
                value: _sendAmount
            }(
                1,
                block.timestamp,
                _user
            )
            returns (uint256 returnReceiveTokenAmount){
                return(address(receiveTokenExchange), returnReceiveTokenAmount);
            }
            catch {
                revert("Error swapEthToToken");
            }
        }
        else
        {
            revert("Error ReceiveTokenExchange does not exist");
        }
    }


    // ======= ACTION CONDITIONS CHECK =========
    // Overriding and extending GelatoActionsStandard's function (optional)
    function termsOk(uint256, address _userProxy, bytes calldata _actionData, uint256)
        external
        view
        virtual
        override
        returns(string memory)  // actionCondition
    {
        (address _user, address _sellToken, uint256 _sellAmount, address _receiveToken) = abi.decode(_actionData[4:], (
            address,
            address,
            uint256,
            address)
        );
        return _actionProviderTermsCheck(_user, _userProxy, _sellToken, _sellAmount, _receiveToken);
    }

    function _actionProviderTermsCheck(
        address _user,
        address _userProxy,
        address _sendToken,
        uint256 _sendAmt,
        address _receiveToken
    )
        internal
        view
        virtual
        returns (string memory)  // actionTermsOk
    {
        IERC20 sendERC20 = IERC20(_sendToken);

        try sendERC20.balanceOf(_user) returns(uint256 userSendTokenBalance) {
            if (userSendTokenBalance < _sendAmt)
                return "ActionUniswapTrade: NotOkUserBalance";
        } catch {
            return "ActionUniswapTrade: ErrorBalanceOf";
        }

        try sendERC20.allowance(_user, _userProxy) returns(uint256 userProxySendTokenAllowance) {
            if (userProxySendTokenAllowance < _sendAmt)
                return "ActionUniswapTrade: NotOkUserProxySendTokenAllowance";
        } catch {
            return "ActionUniswapTrade: ErrorAllowance";
        }

        if (_sendToken != ETH_ADDRESS) {
            IUniswapExchange sendTokenExchange = UNI_FACTORY.getExchange(sendERC20);
            if (sendTokenExchange == IUniswapExchange(0)) {
                return "ActionUniswapTrade: sendTokenExchangeDoesNotExist";
            }
            if (_receiveToken != ETH_ADDRESS) {
                IERC20 receiveERC20 = IERC20(_receiveToken);
                IUniswapExchange receiveTokenExchange = UNI_FACTORY.getExchange(receiveERC20);
                if (receiveTokenExchange == IUniswapExchange(0)) {
                    return "ActionUniswapTrade: receiveTokenExchangeDoesNotExistOne";
                }
            }
        }
        else {
            IERC20 receiveERC20 = IERC20(_receiveToken);
            IUniswapExchange receiveTokenExchange = UNI_FACTORY.getExchange(receiveERC20);
            if (receiveTokenExchange == IUniswapExchange(0)) {
                return "ActionUniswapTrade: receiveTokenExchangeDoesNotExistTwo";
            }
        }
        // STANDARD return string to signal actionConditions Ok
        return OK;
    }

}
