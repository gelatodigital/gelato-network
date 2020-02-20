pragma solidity ^0.6.2;

import "../GelatoActionsStandard.sol";
import "../../external/IERC20.sol";
// import "../../external/SafeERC20.sol";
import "../../dapp_interfaces/kyber/IKyber.sol";
import "../../external/SafeMath.sol";
import "../../external/Address.sol";

contract ActionKyberTrade is GelatoActionsStandard {
    // using SafeERC20 for IERC20; <- internal library methods vs. try/catch
    using SafeMath for uint256;
    using Address for address;

    // actionSelector public state variable np due to this.actionSelector constant issue
    function actionSelector() external pure override returns(bytes4) {
        return this.action.selector;
    }
    uint256 public constant override actionGas = 1200000;

    function action(
        // Standard Action Params
        address _user,
        address _userProxy,
        address _sendToken,
        uint256 _sendAmt,
        // Specific Action Params
        address _receiveToken
    )
        external
        virtual
    {
        require(address(this) == _userProxy, "ErrorUserProxy");

        // !!!!!!!!! MAINNET !!!!!!
        address kyberAddress = 0x818E6FECD516Ecc3849DAf6845e3EC868087B755;

        IERC20 sendERC20 = IERC20(_sendToken);
        try sendERC20.transferFrom(_user, _userProxy, _sendAmt) {} catch {
            revert("ErrorTransferFromUser");
        }
        try sendERC20.approve(kyberAddress, _sendAmt) {} catch {
            revert("ErrorApproveKyber");
        }

        // !! Dapp Interaction !!
        try IKyber(kyberAddress).trade(
            _sendToken,
            _sendAmt,
            _receiveToken,
            _user,  // receiver
            2**255,
            0,  // minConversionRate (if price condition, limit order still possible)
            address(0xe1F076849B781b1395Fd332dC1758Dbc129be6EC)  // fee-sharing: gelato-node
        )
            returns(uint256 receiveAmt)
        {
            emit LogTwoWay(
                _user,  // origin
                _sendToken,
                _sendAmt,
                kyberAddress,  // destination
                _receiveToken,
                receiveAmt,
                _user  // receiver
            );
        } catch {
            revert("KyberTradeError");
        }
    }

    // ====== ACTION CONDITIONS CHECK ==========
    // Overriding and extending GelatoActionsStandard's function (optional)
    function actionConditionsCheck(bytes calldata _actionPayloadWithSelector)
        external
        view
        override
        virtual
        returns(string memory)  // actionCondition
    {
        (address _user, address _userProxy, address _sendToken, uint256 _sendAmt) = abi.decode(
            _actionPayloadWithSelector[4:132],
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
        if (!_isUserOwnerOfGnosisSafeProxy(_user, _userProxy))
            return "ActionKyberTrade: NotOkUserGnosisSafeProxyOwner";

        if (!_sendToken.isContract()) return "ActionKyberTrade: NotOkSrcAddress";

        IERC20 sendERC20 = IERC20(_sendToken);
        try sendERC20.balanceOf(_user) returns(uint256 userSendTokenBalance) {
            if (userSendTokenBalance < _sendAmt)
                return "ActionKyberTrade: NotOkUserSendTokenBalance";
        } catch {
            return "ActionKyberTrade: ErrorBalanceOf";
        }
        try sendERC20.allowance(_user, _userProxy) returns(uint256 userProxySendTokenAllowance) {
            if (userProxySendTokenAllowance < _sendAmt)
                return "ActionKyberTrade: NotOkUserGnosisSafeProxySendTokenAllowance";
        } catch {
            return "ActionKyberTrade: ErrorAllowance";
        }

        // STANDARD return string to signal actionConditions Ok
        return "ok";
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
        IERC20 sendERC20 = IERC20(_sendToken);
        try sendERC20.balanceOf(_user) returns(uint256 userSendTokenBalance) {
            return userSendTokenBalance;
        } catch {
            revert(
                "Error: ActionKyberTrade.getUsersSendTokenBalance: balanceOf"
            );
        }
    }
}
