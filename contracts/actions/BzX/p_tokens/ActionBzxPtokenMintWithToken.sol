pragma solidity ^0.6.4;

import "../../GelatoActionsStandard.sol";
import "../../../external/IERC20.sol";
import "../../../dapp_interfaces/bZx/IBzxPtoken.sol";
import "../../../external/SafeMath.sol";
import "../../../external/Address.sol";
import "@nomiclabs/buidler/console.sol";

contract ActionBzxPtokenMintWithToken is GelatoActionsStandard {
    // using SafeERC20 for IERC20; <- internal library methods vs. try/catch
    using SafeMath for uint256;
    using Address for address;

    // actionSelector public state variable np due to this.actionSelector constant issue
    function actionSelector() external pure override returns(bytes4) {
        return this.action.selector;
    }

    function action(
        // Standard Action Params
        address _user,  // "receiver"
        address _userProxy,
        address _sendToken, // depositToken
        uint256 _sendAmt,  // depositAmount
        address _destination  // pToken
    )
        external
        virtual
    {
        require(address(this) == _userProxy, "ErrorUserProxy");

        IERC20 sendToken = IERC20(_sendToken);
        try sendToken.transferFrom(_user, _userProxy, _sendAmt) {} catch {
            revert("ErrorTransferFromUser");
        }
        try sendToken.approve(_destination, _sendAmt) {} catch {
            revert("ErrorApprovePtoken");
        }

        // !! Dapp Interaction !!
        try IBzxPtoken(_destination).mintWithToken(
            _user,  // receiver
            _sendToken,
            _sendAmt,
            0  // maxPriceAllowed - 0 ignores slippage limit
        )
            returns(uint256 receiveAmt)
        {
            emit LogTwoWay(
                _user,  // origin
                _sendToken,
                _sendAmt,
                _destination,  // pToken
                _destination,  // receiveToken == minted pToken
                receiveAmt,  // minted pTokens
                _user  // receiver
            );
        } catch {
            revert("ErrorPtokenMintWithToken");
        }
    }

    // ======= ACTION CONDITIONS CHECK =========
    // Overriding and extending GelatoActionsStandard's function (optional)
    function actionConditionsCheck(bytes calldata _actionPayload)
        external
        view
        override
        virtual
        returns(string memory)  // actionCondition
    {
        (address _user,
         address _userProxy,
         address _sendToken,
         uint256 _sendAmt,
         address _destination) = abi.decode(
            _actionPayload[4:164],
            (address,address,address,uint256,address)
        );
        return _actionConditionsCheck(_user, _userProxy, _sendToken, _sendAmt, _destination);
    }

    function _actionConditionsCheck(
        address _user,
        address _userProxy,
        address _sendToken,  // depositToken
        uint256 _sendAmt,  // depositAmount
        address _destination  // pToken
    )
        internal
        view
        virtual
        returns(string memory)  // actionCondition
    {
        if (!_sendToken.isContract())
            return "ActionBzxPtokenMintWithToken: NotOkSendTokenAddress";

        IERC20 sendToken = IERC20(_sendToken);
        try sendToken.balanceOf(_user) returns(uint256 userSendTokenBalance) {
            if (userSendTokenBalance < _sendAmt)
                return "ActionBzxPtokenMintWithToken: NotOkUserSendTokenBalance";
        } catch {
            return "ActionBzxPtokenMintWithToken: ErrorBalanceOf";
        }
        try sendToken.allowance(_user, _userProxy)
            returns(uint256 userProxySendTokenAllowance)
        {
            if (userProxySendTokenAllowance < _sendAmt)
                return "ActionBzxPtokenMintWithToken: NotOkUserProxySendTokenAllowance";
        } catch {
            return "ActionBzxPtokenMintWithToken: ErrorAllowance";
        }

        // !! Dapp Interaction !!
        try IBzxPtoken(_destination).marketLiquidityForLoan()
            returns (uint256 maxDepositAmount)
        {
            if (maxDepositAmount < _sendAmt)
                return "ActionBzxPtokenMintWithToken: NotOkSendAmount";
        } catch {
           return "ActionBzxPtokenMintWithToken: ErrorMarketLiquidityForLoan";
        }

        // STANDARD return string to signal actionConditions Ok
        return "ok";
    }


    // ============ API for FrontEnds ===========
    function getUsersSendTokenBalance(
        // Standard Action Params
        address _user,  // "receiver"
        address _userProxy,
        // Specific Action Params
        address _sendToken,  // depositToken
        uint256,
        address
    )
        external
        view
        virtual
        returns(uint256)
    {
        _userProxy;  // silence warning
        IERC20 sendToken = IERC20(_sendToken);
        try sendToken.balanceOf(_user) returns(uint256 userSendTokenBalance) {
            return userSendTokenBalance;
        } catch {
            revert(
                "Error: ActionBzxPtokenMintWithToken.getUsersSendTokenBalance: balanceOf"
            );
        }
    }
}
