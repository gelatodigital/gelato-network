pragma solidity ^0.6.0;

import "../GelatoActionsStandard.sol";
//import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "../../helpers/SplitFunctionSelector.sol";
import "../../dapp_interfaces/kyber_interfaces/IKyber.sol";

contract ActionKyberTrade is GelatoActionsStandard, SplitFunctionSelector {
    // using SafeERC20 for IERC20;

    // actionSelector public state variable np due to this.actionSelector constant issue
    function actionSelector() external pure override returns(bytes4) {
        return this.action.selector;
    }
    uint256 public constant override actionConditionsOkGas = 50000;
    uint256 public constant override actionGas = 700000;
    uint256 public constant override actionTotalGas = actionConditionsOkGas + actionGas;

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
        returns (uint256 destAmt)
    {
        // !!!!!!!!! ROPSTEN !!!!!!
        address kyberAddress = 0x818E6FECD516Ecc3849DAf6845e3EC868087B755;
        {
            IERC20 srcERC20 = IERC20(_src);
            srcERC20.transferFrom(_user, address(this), _srcAmt);
            srcERC20.approve(kyberAddress, _srcAmt);
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
            _userProxy,
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
        override
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
        (address _user, address _userProxy, address _src, uint256 _srcAmt, , ) = abi.decode(
            payload,
            (address, address, address, uint256, address,uint256)
        );
        IERC20 srcERC20 = IERC20(_src);
        uint256 srcUserBalance = srcERC20.balanceOf(_user);
        uint256 srcUserProxyAllowance = srcERC20.allowance(_user, _userProxy);
        return (srcUserBalance >= _srcAmt && _srcAmt <= srcUserProxyAllowance);
    }
}