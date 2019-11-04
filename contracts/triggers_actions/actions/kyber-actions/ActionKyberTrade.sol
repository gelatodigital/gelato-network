
pragma solidity ^0.5.0;

import '../GelatoActionsStandard.sol';
import '../../../Interfaces/Kyber/IKyber.sol';
import '@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol';

contract ActionKyberTrade is GelatoActionsStandard
{
    function initialize()
        external
        initializer
    {
        GelatoActionsStandard
            ._initialize("action(address,address,address,uint256,uint256)",
                         300000
        );
    }

    event LogTrade(address src,
                   uint256 srcAmt,
                   address dest,
                   uint256 destAmt,
                   address user,
                   uint256 minConversionRate,
                   address feeSharingParticipant
    );


    function action(address _src,
                    uint256 _srcAmt,
                    address _dest,
                    address _user,
                    uint256 _minConversionRate
    )
        external
        returns (uint256 destAmt)
    {
        ///@notice KyberNetworkProxy on ropsten
        address kyber = 0x818E6FECD516Ecc3849DAf6845e3EC868087B755;
        IERC20 srcERC20 = IERC20(_src);
        uint256 kyberAllowance = srcERC20.allowance(address(this), kyber);
        if (kyberAllowance < _srcAmt) {
            srcERC20.approve(kyber, 2**255);
        }
        srcERC20.transferFrom(_user, address(this), _srcAmt);
        destAmt = IKyber(kyber).trade(_src,
                                      _srcAmt,
                                      _dest,
                                      _user,
                                      2**255,
                                      _minConversionRate,
                                      address(0)  // fee-sharing
        );
        emit LogTrade(_src,
                      _srcAmt,
                      _dest,
                      destAmt,
                      _user,
                      _minConversionRate,
                      address(0)  // fee-sharing
        );
    }
}
