pragma solidity ^0.6.0;

import "../GelatoActionsStandard.sol";
import "../../../external/IERC20.sol";
import "../../../external/SafeERC20.sol";
import "../../dapp_interfaces/kyber_interfaces/IKyber.sol";

contract ActionKyberTrade is GelatoActionsStandard {
    using SafeERC20 for IERC20;

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

    modifier actionGasCheck override {
        require(
            gasleft() >= actionGas,
            "ActionKyberTrade.actionGasCheck: failed"
        );
        _;
    }

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
            _userProxy,
            _src,
            _srcAmt,
            _dest,
            destAmt,
            _minConversionRate,
            address(0)  // fee-sharing
        );
    }

    function actionConditionsCheck(bytes calldata _actionPayloadWithSelector)
        external
        view
        override
        returns(bool)
    {
        bytes4 selector = abi.decode(_actionPayloadWithSelector[:4], (bytes4));
        require(
            selector == this.action.selector,
            "ActionKyberTrade.actionConditionsCheck: selector mismatch"
        );
        (address _user, address _userProxy, address _src, uint256 _srcAmt,,) = abi.decode(
            _actionPayloadWithSelector[4:],
            (address,address,address,uint256,address,uint256)
        );
        return _actionConditionsOk(_user, _userProxy, _src, _scrAmt);
    }

    function _actionConditionsOk(
        address _user,
        address _userProxy,
        address _src,
        uint256 _srcAmt
    )
        internal
        view
        returns(bool)
    {
        IERC20 srcERC20 = IERC20(_src);
        uint256 srcUserBalance = srcERC20.balanceOf(_user);
        uint256 srcUserProxyAllowance = srcERC20.allowance(_user, _userProxy);
        return (srcUserBalance >= _srcAmt && _srcAmt <= srcUserProxyAllowance);
    }
}
