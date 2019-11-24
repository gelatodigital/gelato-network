pragma solidity ^0.5.0;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "../GelatoUpgradeableActionsStandard.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/SafeERC20.sol";
import "../../../helpers/SplitFunctionSelector.sol";
import "../../dapp_interfaces/kyber_interfaces/IKyber.sol";

contract UpgradeableActionKyberTrade is Initializable,
                                        GelatoUpgradeableActionsStandard,
                                        SplitFunctionSelector
{
    using SafeERC20 for IERC20;

    address internal kyberAddress;

    function getKyberAddress() external view returns(address) {return kyberAddress;}

    function initialize(address _proxyAdmin,
                        uint256 _actionGasStipend,
                        address _kyber
    )
        external
        initializer
    {
        myProxyAdmin = ProxyAdmin(_proxyAdmin);
        actionOperation = ActionOperation.proxydelegatecall;
        actionSelector = this.action.selector;
        actionGasStipend = _actionGasStipend;
        kyberAddress = _kyber;
        UpgradeableActionKyberTrade implementation
            = UpgradeableActionKyberTrade(_getMyImplementationAddress());
        implementation.initialize(_proxyAdmin, _actionGasStipend, _kyber);
        require(implementation.getKyberAddress() != address(0),
            "UpgradeableActionKyberTrade.initialize: implementation init failed"
        );
    }

    modifier initialized() {
        require(kyberAddress != address(0),
            "UpgradeableActionKyberTrade.initialized: failed"
        );
        _;
    }

    function _actionConditionsFulfilled(bytes memory _actionPayload)
        internal
        view
        returns(bool)
    {
        (bytes4 functionSelector,
         bytes memory payload) = _splitFunctionSelector(_actionPayload);
        (address _user,
         address _src,
         uint256 _srcAmt, , ) = abi.decode(payload, (address,
                                                     address,
                                                     uint256,
                                                     address,
                                                     uint256)
        );
        IERC20 srcERC20 = IERC20(_src);
        uint256 srcUserBalance = srcERC20.balanceOf(_user);
        uint256 srcUserProxyAllowance = srcERC20.allowance(_user, address(this));
        return (functionSelector == actionSelector &&
                kyberAddress != address(0) &&
                srcUserBalance >= _srcAmt &&
                _srcAmt <= srcUserProxyAllowance
        );
    }

    function actionConditionsFulfilled(bytes calldata _actionPayload)
        external
        view
        returns(bool)
    {
        return _actionConditionsFulfilled(_actionPayload);
    }

    function action(// Standard Action Params
                    address _user,
                    // Specific Action Params
                    address _src,
                    uint256 _srcAmt,
                    address _dest,
                    uint256 _minConversionRate
    )
        external
        initialized
        returns (uint256 destAmt)
    {
        {
            IERC20 srcERC20 = IERC20(_src);
            srcERC20.safeTransferFrom(_user, address(this), _srcAmt);
            srcERC20.safeIncreaseAllowance(kyberAddress, _srcAmt);
        }
        destAmt = IKyber(kyberAddress).trade(_src,
                                          _srcAmt,
                                          _dest,
                                          _user,
                                          2**255,
                                          _minConversionRate,
                                          address(0)  // fee-sharing
        );
        emit LogAction(_user,
                       _src,
                       _srcAmt,
                       _dest,
                       destAmt,
                       _minConversionRate,
                       address(0)  // fee-sharing
        );
    }
    event LogAction(address indexed user,
                    address indexed src,
                    uint256 srcAmt,
                    address dest,
                    uint256 destAmt,
                    uint256 minConversionRate,
                    address feeSharingParticipant
    );
}
