pragma solidity ^0.6.0;

import "../GelatoActionsStandard.sol";
import "../../external/IERC20.sol";
// import "../../external/SafeERC20.sol";
import "../../helpers/SplitFunctionSelector.sol";
import "../../dapp_interfaces/kyber_interfaces/IKyber.sol";
import "../../gelato_core/GelatoCoreEnums.sol";

contract ActionKyberTrade is GelatoActionsStandard, SplitFunctionSelector {
    // using SafeERC20 for IERC20; <- internal library methods vs. try/catch

    // Extends IGelatoAction.StandardReason (no overrides for enums in solc yet)
    enum Reason {
        // StandardReason Fields
        Ok,  // 0: Standard Field for Fulfilled Conditions and No Errors
        NotOk,  // 1: Standard Field for Unfulfilled Conditions or Caught/Handled Errors
        UnhandledError,  // 2: Standard Field for Uncaught/Unhandled Errors
        // NotOk: Unfulfilled Conditions
        UserBalanceNotOk,
        UserProxyAllowanceNotOk,
        // NotOk: Caught/Handled Errors
        TransferFromUserError,
        ApproveKyberError,
        UndefinedDappError
    }

    // actionSelector public state variable np due to this.actionSelector constant issue
    function actionSelector() external pure override returns(bytes4) {
        return this.action.selector;
    }
    uint256 public constant override actionConditionsCheckGas = 50000;
    uint256 public constant override actionGas = 700000;
    uint256 public constant override actionTotalGas = actionConditionsCheckGas + actionGas;

    event LogAction(
        address indexed user,
        address indexed userProxy,
        address indexed src,
        uint256 srcAmt,
        address dest,
        uint256 destAmt,
        uint256 minConversionRate,
        address feeSharingParticipant
    );

    function action(
        // Standard Action Params
        address _user,
        address _userProxy,
        // Specific Action Params
        address _src,
        uint256 _srcAmt,
        address _dest,
        uint256 _minConversionRate
    )
        external
        returns (GelatoCoreEnums.ExecutionResult, Reason)
    {
        // !!!!!!!!! ROPSTEN !!!!!!
        address kyberAddress = 0x818E6FECD516Ecc3849DAf6845e3EC868087B755;
        {
            IERC20 srcERC20 = IERC20(_src);

            try srcERC20.transferFrom(_user, address(this), _srcAmt) {
                // pass
            } catch {
                return (
                    GelatoCoreEnums.ExecutionResult.ActionNotOk,
                    Reason.TransferFromUserError
                );
            }

            try srcERC20.approve(kyberAddress, _srcAmt) {
                // pass
            } catch {
                return (
                    GelatoCoreEnums.ExecutionResult.ActionNotOk,
                    Reason.ApproveKyberError
                );
            }
        }

        // !! Dapp Interaction !!
        try IKyber(kyberAddress).trade(
            _src,
            _srcAmt,
            _dest,
            _user,
            2**255,
            _minConversionRate,
            address(0)  // fee-sharing
        )
            returns (uint256 destAmt)
        {
            // Success on Dapp
            emit LogAction(
                _user,
                _userProxy,
                _src,
                _srcAmt,
                _dest,
                destAmt,
                _minConversionRate,
                address(0)  // fee-sharing
            );
            return (GelatoCoreEnums.ExecutionResult.Success, Reason.Ok);
        } catch {
            return (
                GelatoCoreEnums.ExecutionResult.DappNotOk,
                Reason.UndefinedDappError
            );
        }
    }

    // Overriding and extending GelatoActionsStandard's function (optional)
    function actionConditionsCheck(bytes calldata _actionPayloadWithSelector)
        external
        view
        override
        returns(bool, uint8)  // executable?, reason
    {
        return _actionConditionsCheck(_actionPayloadWithSelector);
    }

    function _actionConditionsCheck(bytes memory _actionPayloadWithSelector)
        internal
        view
        returns(bool, uint8)  // executable?, reason
    {
        (, bytes memory payload) = SplitFunctionSelector.split(
            _actionPayloadWithSelector
        );

        (address _user, address _userProxy, address _src, uint256 _srcAmt,,) = abi.decode(
            payload,
            (address, address, address, uint256, address,uint256)
        );

        IERC20 srcERC20 = IERC20(_src);

        uint256 userSrcBalance = srcERC20.balanceOf(_user);
        if (userSrcBalance < _srcAmt) return (false, uint8(Reason.UserBalanceNotOk));

        uint256 userProxySrcAllowance = srcERC20.allowance(_user, _userProxy);
        if (userProxySrcAllowance < _srcAmt)
            return (false, uint8(Reason.UserProxyAllowanceNotOk));

        return (true, uint8(Reason.Ok));
    }
}
