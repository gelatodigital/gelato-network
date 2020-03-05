pragma solidity ^0.6.2;

import "../../GelatoActionsStandard.sol";
import "../../../external/Ownable.sol";
import "../../../external/IERC20.sol";
import "../../../dapp_interfaces/bZx/IBzxPtoken.sol";
import "../../../external/SafeMath.sol";
import "../../../external/Address.sol";

contract ActionBzxPtokenBurnToToken is GelatoActionsStandard, Ownable {
    // using SafeERC20 for IERC20; <- internal library methods vs. try/catch
    using SafeMath for uint256;
    using Address for address;

    // actionSelector public state variable np due to this.actionSelector constant issue
    function actionSelector() external pure override returns(bytes4) {
        return this.action.selector;
    }
    uint256 public actionGas = 4200000;
    function getActionGas() external view override virtual returns(uint256) {
        return actionGas;
    }
    function setActionGas(uint256 _actionGas) external virtual onlyOwner {
        actionGas = _actionGas;
    }

    function action(
        // Standard Action Params
        address _user,  // "receiver"
        address _userProxy,
        address _sendToken,  // pToken
        uint256 _sendAmt,
        // Specific Action Params
        address _receiveToken
    )
        external
        virtual
    {
        require(address(this) == _userProxy, "ActionBzxPtokenBurnToToken: ErrorUserProxy");

        IERC20 sendToken = IERC20(_sendToken);  // pToken!
        try sendToken.transferFrom(_user, _userProxy, _sendAmt) {} catch {
           revert("ErrorTransferFromPToken");
        }

        // !! Dapp Interaction !!
        try IBzxPtoken(_sendToken).burnToToken(
            _user,  // receiver
            _receiveToken,
            _sendAmt,
            0 // minPriceAllowed - 0 ignores slippage
        )
            returns(uint256 receiveAmt)
        {
            emit LogTwoWay(
                _user, // origin
                _sendToken,  // pToken
                _sendAmt,
                address(0),  // destination pToken -> burn
                _receiveToken,
                receiveAmt,
                _user  // receiver
            );
        } catch {
           revert("ErrorPtokenBurnToToken");
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
        (address _user, address _userProxy, address _sendToken, uint256 _sendAmt) = abi.decode(
            _actionPayload[4:132],
            (address,address,address,uint256)
        );
        return _actionConditionsCheck(_user, _userProxy, _sendToken, _sendAmt);
    }

    function _actionConditionsCheck(
        address _user,
        address _userProxy,
        address _sendToken,
        uint256 _sendAmt
    )
        internal
        view
        virtual
        returns(string memory)  // actionCondition
    {
        if(!_sendToken.isContract())
            return "ActionBzxPtokenBurnToToken: NotOkPTokenAddress";

        IERC20 sendToken = IERC20(_sendToken);  // pToken!
        try sendToken.balanceOf(_user) returns(uint256 userPtokenBalance) {
            if (userPtokenBalance < _sendAmt)
                return "ActionBzxPtokenBurnToToken: NotOkUserPtokenBalance";
        } catch {
            return "ActionBzxPtokenBurnToToken: ErrorBalanceOf";
        }
        try sendToken.allowance(_user, _userProxy) returns(uint256 userProxyPtokenAllowance) {
            if (userProxyPtokenAllowance < _sendAmt)
                return "ActionBzxPtokenBurnToToken: NotOkUserProxyPtokenAllowance";
        } catch {
            return "ActionBzxPtokenBurnToToken: ErrorAllowance";
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
        address _sendToken,
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
        try sendToken.balanceOf(_user) returns(uint256 userPTokenBalance) {
            return userPTokenBalance;
        } catch {
            revert(
                "Error: ActionBzxPtokenBurnToToken.getUsersSendTokenBalance: balanceOf: balanceOf"
            );
        }
    }
}
