pragma solidity ^0.6.8;

import "../GelatoActionsStandard.sol";
import "../../external/IERC20.sol";
// import "../../external/SafeERC20.sol";
import "../../dapp_interfaces/uniswap/IUniswapExchange.sol";
import "../../dapp_interfaces/uniswap/IUniswapFactory.sol";
import "../../external/SafeMath.sol";
import "../../external/Address.sol";

contract ActionUniswapTrade is GelatoActionsStandard {
    using SafeMath for uint256;
    using Address for address;

    // actionSelector public state variable np due to this.actionSelector constant issue
    function actionSelector() external pure override returns(bytes4) {
        return this.action.selector;
    }

    address public constant ETH_ADDRESS = address(
        0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
    );

    function action(
        // Standard Action Params
        address _user, //"receiver"
        address _userProxy,
        // Specific Action Params
        address _sendToken, // exchange
        uint256 _sendAmt, // tokens_sold
        address _receiveToken // token_addr
    )
        external
        virtual
    {
        require(address(this) == _userProxy, "ErrorUserProxy");

        uint256 returnAmount;
        address destinationAddress;

        // Constants: Uniswap Factory !!!!!!!!Mainnet!!!!!!!!
        IUniswapFactory uniswapFactory = getUniswapFactory();

        // If sendToken is not ETH
        if (_sendToken != ETH_ADDRESS) {

            IERC20 sendERC20 = IERC20(_sendToken);

            IUniswapExchange sendTokenExchange = uniswapFactory.getExchange(sendERC20);

            try sendERC20.transferFrom(_user, _userProxy, _sendAmt) {} catch {
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
           (destinationAddress, returnAmount) = swapEthToToken(_receiveToken, _sendAmt, uniswapFactory, _user);
        }

        emit LogTwoWay(
            _user,  // origin
            _sendToken, // what token was sold
            _sendAmt, // how much was sold
            destinationAddress,  // uniswap exchange address of receiving token
            _receiveToken, // receiving Token
            returnAmount, // how much was received
            _user  // receiver
        );

    }

    function swapEthToToken(address _receiveToken, uint256 _sendAmount, IUniswapFactory uniswapFactory, address _user)
        internal
        returns (address, uint256)
    {
        IERC20 receiveERC20 = IERC20(_receiveToken);
        IUniswapExchange receiveTokenExchange = uniswapFactory.getExchange(receiveERC20);
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

    // Returns Mainnet uniswap factory
    function getUniswapFactory()
        internal
        pure
        returns(IUniswapFactory)
    {
        return IUniswapFactory(0xc0a47dFe034B400B47bDaD5FecDa2621de6c4d95);
    }

    // ====== ACTION CONDITIONS CHECK ==========
    // Overriding and extending GelatoActionsStandard's function (optional)
    function termsOk(bytes calldata _actionData)
        external
        view
        override
        virtual
        returns(string memory)  // actionTermsOk
    {
        (address _user, address _userProxy, address _sendToken, uint256 _sendAmt, address _receiveToken) = abi.decode(
            _actionData[4:164],
            (address,address,address,uint256,address)
        );
        return _actionConditionsCheck(_user, _userProxy, _sendToken, _sendAmt, _receiveToken);
    }

    function _actionConditionsCheck(
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
        // if (!_isUserOwnerOfUserProxy(_user, _userProxy))
        //     return "ActionUniswapTrade: NotOkUserProxyOwner";

        IERC20 sendERC20 = IERC20(_sendToken);

        IUniswapFactory uniswapFactory = getUniswapFactory();

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
            IUniswapExchange sendTokenExchange = uniswapFactory.getExchange(sendERC20);
            if (sendTokenExchange == IUniswapExchange(0)) {
                return "ActionUniswapTrade: sendTokenExchangeDoesNotExist";
            }
            if (_receiveToken != ETH_ADDRESS) {
                IERC20 receiveERC20 = IERC20(_receiveToken);
                IUniswapExchange receiveTokenExchange = uniswapFactory.getExchange(receiveERC20);
                if (receiveTokenExchange == IUniswapExchange(0)) {
                    return "ActionUniswapTrade: receiveTokenExchangeDoesNotExistOne";
                }
            }
        }
        else {
            IERC20 receiveERC20 = IERC20(_receiveToken);
            IUniswapExchange receiveTokenExchange = uniswapFactory.getExchange(receiveERC20);
            if (receiveTokenExchange == IUniswapExchange(0)) {
                return "ActionUniswapTrade: receiveTokenExchangeDoesNotExistTwo";
            }
        }
        // STANDARD return string to signal actionConditions Ok
        return OK;
    }

    // ============ API for FrontEnds ===========
    function getUsersSendTokenBalance(
        // Standard Action Params
        address _user,
        address _userProxy,
        // Specific Action Params
        address _sendToken,  // sendToken
        uint256,
        address
    )
        external
        view
        virtual
        returns(uint256)
    {
        _userProxy;  // silence warning
        if (_sendToken != ETH_ADDRESS)
        {
            IERC20 sendERC20 = IERC20(_sendToken);
            try sendERC20.balanceOf(_user) returns(uint256 userSendTokenBalance) {
                return userSendTokenBalance;
            } catch {
                revert(
                    "Error: ActionUniswapTrade.getUsersSendTokenBalance: balanceOf"
                );
            }
        } else {
            return _user.balance;
        }
    }

}
