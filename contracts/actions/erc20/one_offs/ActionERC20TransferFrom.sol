pragma solidity ^0.6.2;

import "../../GelatoActionsStandard.sol";
import "../../../external/Ownable.sol";
import "../../../external/IERC20.sol";
// import "../../../external/SafeERC20.sol";
import "../../../dapp_interfaces/kyber/IKyber.sol";
import "../../../external/SafeMath.sol";
import "../../../external/Address.sol";

contract ActionERC20TransferFrom is GelatoActionsStandard, Ownable {
    // using SafeERC20 for IERC20; <- internal library methods vs. try/catch
    using SafeMath for uint256;
    using Address for address;

    // actionSelector public state variable np due to this.actionSelector constant issue
    function actionSelector() external pure override virtual returns(bytes4) {
        return this.action.selector;
    }
    uint256 public actionGasTransferFrom = 300000;
    function getActionGas() external view override virtual returns(uint256) {
        return actionGasTransferFrom;
    }
    function setActionGas(uint256 _actionGas) external virtual onlyOwner {
        actionGasTransferFrom = _actionGas;
    }

    function action(
        // Standard Action Params
        address[2] memory _userAndProxy,
        // Specific Action Params
        address[2] memory _sendTokenAndDesination,
        uint256 _sendAmount
    )
        public
        virtual
    {
        require(address(this) == _userAndProxy[1], "ErrorUserProxy");
        IERC20 sendERC20 = IERC20(_sendTokenAndDesination[0]);
        try sendERC20.transferFrom(
            _userAndProxy[0],
            _sendTokenAndDesination[1],
            _sendAmount
        ) {
            emit LogOneWay(
                _userAndProxy[0],
                _sendTokenAndDesination[0],
                _sendAmount,
                _sendTokenAndDesination[1]
            );
        } catch {
            revert("ErrorTransferFromUser");
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
        (address[2] memory _userAndProxy,
         address[2] memory _sendTokenAndDesination,
         uint256 _sendAmount) = abi.decode(
            _actionPayload[4:],
            (address[2],address[2],uint256)
        );
        return _actionConditionsCheck(
            _userAndProxy,
            _sendTokenAndDesination,
            _sendAmount
        );
    }

    function _actionConditionsCheck(
        // Standard Action Params
        address[2] memory _userAndProxy,
        // Specific Action Params
        address[2] memory _sendTokenAndDesination,
        uint256 _sendAmount
    )
        internal
        view
        virtual
        returns(string memory)  // actionCondition
    {
        if (!_sendTokenAndDesination[0].isContract())
            return "ActionERC20TransferFrom: NotOkSrcAddress";

        IERC20 sendERC20 = IERC20(_sendTokenAndDesination[0]);
        try sendERC20.balanceOf(_userAndProxy[0]) returns(uint256 sendERC20Balance) {
            if (sendERC20Balance < _sendAmount)
                return "ActionERC20TransferFrom: NotOkUserSendTokenBalance";
        } catch {
            return "ActionERC20TransferFrom: ErrorBalanceOf";
        }
        try sendERC20.allowance(_userAndProxy[0], _userAndProxy[1])
            returns(uint256 userProxySendTokenAllowance)
        {
            if (userProxySendTokenAllowance < _sendAmount)
                return "ActionERC20TransferFrom: NotOkUserProxySendTokenAllowance";
        } catch {
            return "ActionERC20TransferFrom: ErrorAllowance";
        }

        // STANDARD return string to signal actionConditions Ok
        return "ok";
    }

    // ============ API for FrontEnds ===========
    function getUsersSendTokenBalance(
        // Standard Action Params
        address[2] memory _userAndProxy,
        // Specific Action Params
        address[2] memory _sendTokenAndDesination,
        uint256
    )
        public
        view
        virtual
        returns(uint256)
    {
        IERC20 sendERC20 = IERC20(_sendTokenAndDesination[0]);
        try sendERC20.balanceOf(_userAndProxy[0])
            returns(uint256 userSendERC20Balance)
        {
            return userSendERC20Balance;
        } catch {
            revert("Error: ActionERC20TransferFrom.getUsersSendTokenBalance: balanceOf");
        }
    }
}
