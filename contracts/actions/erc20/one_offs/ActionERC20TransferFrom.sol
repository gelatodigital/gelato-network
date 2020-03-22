pragma solidity ^0.6.2;

import "../../GelatoActionsStandard.sol";
import "../../../external/IERC20.sol";
// import "../../../external/SafeERC20.sol";
import "../../../external/Address.sol";

contract ActionERC20TransferFrom is GelatoActionsStandard {
    // using SafeERC20 for IERC20; <- internal library methods vs. try/catch
    using Address for address;

    // actionSelector public state variable np due to this.actionSelector constant issue
    function actionSelector() public pure override virtual returns(bytes4) {
        return this.action.selector;
    }

    function action(
        // Standard Action Params
        address _user,
        // Specific Action Params
        address _sendToken,
        address _destination,
        uint256 _sendAmount
    )
        public
        virtual
    {
        IERC20 sendERC20 = IERC20(_sendToken);
        try sendERC20.transferFrom(
            _user,
            _destination,
            _sendAmount
        ) {
            emit LogOneWay(
                _user,  // origin
                _sendToken,  // sendToken
                _sendAmount,
                _destination  // destination
            );
        } catch {
            revert("ActionERC20TransferFrom: ErrorTransferFromUser");
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
        (address _user, address _sendToken,
        , uint256 _sendAmount) = abi.decode(
            _actionPayload[4:],
            (address,address,address,uint256)
        );
        return _actionConditionsCheck(
            _user,
            _sendToken,
            _sendAmount
        );
    }

    function _actionConditionsCheck(
         address _user,
        address _sendToken,
        uint256 _sendAmount
    )
        internal
        view
        virtual
        returns(string memory)  // actionCondition
    {
        if (_user.isContract())
            return "ActionERC20TransferFrom: NotOkSendTokenAddress";

        IERC20 sendERC20 = IERC20(_sendToken);
        try sendERC20.balanceOf(_user) returns(uint256 sendERC20Balance) {
            if (sendERC20Balance < _sendAmount)
                return "ActionERC20TransferFrom: NotOkUserSendTokenBalance";
        } catch {
            return "ActionERC20TransferFrom: ErrorBalanceOf";
        }
        try sendERC20.allowance(_user, address(this))
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
}
