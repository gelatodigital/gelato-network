pragma solidity 0.6.0;

import "../GelatoActionsStandard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "../../helpers/SplitFunctionSelector.sol";
import "../../dapp_interfaces/kyber_interfaces/IKyber.sol";

contract ActionKyberTrade is GelatoActionsStandard, SplitFunctionSelector {
    using SafeERC20 for IERC20;

    uint256 constant internal actionConditionsOkGas = 50000;
    uint256 constant internal actionGas = 700000;
    uint256 constant internal actionTotalGas = actionConditionsOkGas + actionGas;

    // Overriding GelatoActionsStandard event (optional)
    event LogAction(
        address indexed user,
        address indexed src,
        uint256 srcAmt,
        address dest,
        uint256 destAmt,
        uint256 minConversionRate,
        address feeSharingParticipant
    );

    // Overriding GelatoActionsStandard modifier (mandatory)
    modifier actionGasCheck {
        require(
            gasleft() >= actionGas,
            "ActionKyberTrade.actionGasCheck: failed"
        );
        _;
    }

    function action(
        // Standard Action Params
        address _user,
        // Specific Action Params
        address _src,
        uint256 _srcAmt,
        address _dest,
        uint256 _minConversionRate
    )
        external
        actionGasCheck
        returns (uint256 destAmt)
    {
        // !!!!!!!!! ROPSTEN !!!!!!
        address kyberAddress = 0x818E6FECD516Ecc3849DAf6845e3EC868087B755;
        {
            IERC20 srcERC20 = IERC20(_src);
            srcERC20.safeTransferFrom(_user, address(this), _srcAmt);
            srcERC20.safeIncreaseAllowance(kyberAddress, _srcAmt);
        }
        destAmt = IKyber(kyberAddress).trade(
            _src,
            _srcAmt,
            _dest,
            _user,
            2**255,
            _minConversionRate,
            address(0)  // fee-sharing
        );
        emit LogAction(
            _user,
            _src,
            _srcAmt,
            _dest,
            destAmt,
            _minConversionRate,
            address(0)  // fee-sharing
        );
    }

    // Overriding and extending GelatoActionsStandard's function (optional)
    function actionConditionsOk(bytes calldata _actionPayloadWithSelector)
        external
        view
        returns(bool)
    {
        return _actionConditionsOk(_actionPayloadWithSelector);
    }

    function _actionConditionsOk(bytes memory _actionPayloadWithSelector)
        internal
        view
        returns(bool)
    {
        (, bytes memory payload) = SplitFunctionSelector.split(
            _actionPayloadWithSelector
        );
        (address _user, address _src, uint256 _srcAmt, , ) = abi.decode(
            payload,
            (address, address, uint256, address,uint256)
        );
        IERC20 srcERC20 = IERC20(_src);
        uint256 srcUserBalance = srcERC20.balanceOf(_user);
        uint256 srcUserProxyAllowance = srcERC20.allowance(
            _user,
            address(_getProxyOfUser(_user))
        );
        return (srcUserBalance >= _srcAmt && _srcAmt <= srcUserProxyAllowance);
    }

    // Overriding IGelatoAction state readers (mandatory)
    function getActionSelector() external pure returns(bytes4) {return this.action.selector;}
    function getActionConditionsOkGas() external pure returns(uint256) {return actionConditionsOkGas;}
    function getActionGas() external pure returns(uint256) {return actionGas;}
    function getActionTotalGas() external pure returns(uint256) {return actionTotalGas;}
}
