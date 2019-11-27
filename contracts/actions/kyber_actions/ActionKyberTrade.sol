pragma solidity ^0.5.0;

import "../GelatoActionsStandard.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/SafeERC20.sol";
import "../../helpers/SplitFunctionSelector.sol";
import "../../dapp_interfaces/kyber_interfaces/IKyber.sol";

contract ActionKyberTrade is GelatoActionsStandard, SplitFunctionSelector {
    using SafeERC20 for IERC20;

    constructor(uint256 _actionGasStipend)
        public
    {
        actionOperation = ActionOperation.delegatecall;
        actionSelector = this.action.selector;
        actionGasStipend = _actionGasStipend;
    }

    event LogAction(
        address indexed user,
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
        // Specific Action Params
        address _src,
        uint256 _srcAmt,
        address _dest,
        uint256 _minConversionRate
    )
        external
        returns (uint256 destAmt)
    {
        address kyberAddress = 0xF77eC7Ed5f5B9a5aee4cfa6FFCaC6A4C315BaC76;  // rinkeby
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
        (bytes4 functionSelector, bytes memory payload) = SplitFunctionSelector.split(
            _actionPayloadWithSelector
        );
        (address _user, address _src, uint256 _srcAmt, , ) = abi.decode(
            payload,
            (address, address, uint256, address,uint256)
        );
        IERC20 srcERC20 = IERC20(_src);
        uint256 srcUserBalance = srcERC20.balanceOf(_user);
        uint256 srcUserProxyAllowance = srcERC20.allowance(_user, address(this));
        return (
            functionSelector == actionSelector &&
            srcUserBalance >= _srcAmt &&
            _srcAmt <= srcUserProxyAllowance
        );
    }
}
