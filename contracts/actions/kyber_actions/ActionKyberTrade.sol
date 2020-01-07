pragma solidity ^0.6.0;

import "../GelatoActionsStandard.sol";
import "../../external/IERC20.sol";
// import "../../external/SafeERC20.sol";
import "../../helpers/SplitFunctionSelector.sol";
import "../../dapp_interfaces/kyber_interfaces/IKyber.sol";
import "../../gelato_core/GelatoCoreEnums.sol";

contract ActionKyberTrade is GelatoActionsStandard, SplitFunctionSelector {
    // using SafeERC20 for IERC20; <- internal library methods vs. try/catch

    // Extends IGelatoAction.ActionStandardErrorCodes (no overrides for enums in solc yet)
    enum ActionErrorCodes {
        NoError,  // 0 is standard reserved field for NoError
        CaughtError,  // 1 is standard reserved field for CaughtError
        UncaughtError,  // 2 is standard reserved field for UncaughtError
        UserBalance,
        UserProxyAllowance,
        TransferFromUser,
        ApproveKyber,
        DappError
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
        returns (GelatoCoreEnums.ExecutionResult, ActionErrorCodes)
    {
        // !!!!!!!!! ROPSTEN !!!!!!
        address kyberAddress = 0x818E6FECD516Ecc3849DAf6845e3EC868087B755;
        {
            IERC20 srcERC20 = IERC20(_src);

            try srcERC20.transferFrom(_user, address(this), _srcAmt) {
                // pass
            } catch {
                return (
                    GelatoCoreEnums.ExecutionResult.CaughtActionError,
                    ActionErrorCodes.TransferFromUser
                );
            }

            try srcERC20.approve(kyberAddress, _srcAmt) {
                // pass
            } catch {
                return (
                    GelatoCoreEnums.ExecutionResult.CaughtActionError,
                    ActionErrorCodes.ApproveKyber
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
            return (
                GelatoCoreEnums.ExecutionResult.Success, ActionErrorCodes.NoError
            );
        } catch {
            return (
                GelatoCoreEnums.ExecutionResult.CaughtDappError, ActionErrorCodes.DappError
            );
        }
    }

    // Overriding and extending GelatoActionsStandard's function (optional)
    function actionConditionsCheck(bytes calldata _actionPayloadWithSelector)
        external
        view
        override
        returns(bool, uint8)
    {
        return _actionConditionsOk(_actionPayloadWithSelector);
    }

    function _actionConditionsOk(bytes memory _actionPayloadWithSelector)
        internal
        view
        returns(bool, uint8)
    {
        (, bytes memory payload) = SplitFunctionSelector.split(
            _actionPayloadWithSelector
        );

        (address _user, address _userProxy, address _src, uint256 _srcAmt, , ) = abi.decode(
            payload,
            (address, address, address, uint256, address,uint256)
        );

        IERC20 srcERC20 = IERC20(_src);

        uint256 srcUserBalance = srcERC20.balanceOf(_user);

        if (srcUserBalance < _srcAmt)
            return (false, uint8(ActionErrorCodes.UserBalance));

        uint256 srcUserProxyAllowance = srcERC20.allowance(_user, _userProxy);

        if (srcUserProxyAllowance < _srcAmt)
            return (false, uint8(ActionErrorCodes.UserProxyAllowance));

        return (true, uint8(ActionErrorCodes.NoError));
    }
}
