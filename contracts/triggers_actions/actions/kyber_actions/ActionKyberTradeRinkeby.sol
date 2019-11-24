
pragma solidity ^0.5.0;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "../GelatoActionsStandard.sol";
import "../../dapp_interfaces/kyber_interfaces/IKyber.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/SafeERC20.sol";

contract ActionKyberTradeRinkeby is Initializable,
                                    GelatoActionsStandard
{
    using SafeERC20 for IERC20;

    function initialize(uint256 _actionGasStipend)
        external
        initializer
    {
        actionOperation = ActionOperation.delegatecall;
        actionSelector = this.action.selector;
        actionGasStipend = _actionGasStipend;
    }

    ///@dev KyberNetworkProxy on rinkeby hardcoded
    function action(// Standard Action Params
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
        address kyber = 0xF77eC7Ed5f5B9a5aee4cfa6FFCaC6A4C315BaC76;  // rinkeby
        {
            IERC20 srcERC20 = IERC20(_src);
            srcERC20.safeTransferFrom(_user, address(this), _srcAmt);
            srcERC20.safeIncreaseAllowance(kyber, _srcAmt);
        }
        destAmt = IKyber(kyber).trade(_src,
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
