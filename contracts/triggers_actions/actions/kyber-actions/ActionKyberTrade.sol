
pragma solidity ^0.5.0;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import '../GelatoActionsStandard.sol';
import '../../../interfaces/dapp_interfaces/kyber_interfaces/IKyber.sol';
import '../../../helpers/GelatoERC20Lib.sol';
import '@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol';

contract ActionKyberTrade is Initializable,
                             GelatoActionsStandard
{
    using GelatoERC20Lib for IERC20;

    function initialize()
        external
        initializer
    {
        actionSelector = this.action.selector;
        actionGasStipend = 700000;
    }

    ///@dev KyberNetworkProxy on ropsten hardcoded atm
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
        address kyber = 0x818E6FECD516Ecc3849DAf6845e3EC868087B755;  // ropsten
        {
            IERC20 srcERC20 = IERC20(_src);
            require(srcERC20._safeTransferFrom(_user, address(this), _srcAmt),
                "ActionKyberTrade.action: _safeTransferFrom failed"
            );
            require(srcERC20._safeIncreaseERC20Allowance(kyber, _srcAmt),
                "ActionKyberTrade.action: _safeIncreaseERC20Allowance failed"
            );
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
