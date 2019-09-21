pragma solidity ^0.5.10;

import '../gelato_action_standards/GelatoActionsStandard.sol';
import '../../gelato_dappInterfaces/gelato_DutchX/gelato_DutchX_standards/GelatoDutchXStandard.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';

contract ActionSellOnDutchX is GelatoActionsStandard,
                               GelatoDutchXStandard,
                               ReentrancyGuard
{
    constructor(address _gelatoCore,
                string _actionSignature,
                uint256 _actionGasStipend,
                address _DutchX
    )
        public
        GelatoActionsStandard(_gelatoCore, _actionSignature, _actionGasStipend)
        GelatoDutchXStandard(_DutchX)
    {}

    function sellOnDutchX(uint256 _executionClaimId,
                          address _executionClaimOwner,
                          address _sellToken,
                          address _buyToken,
                          uint256 _sellAmount
    )
        nonReentrant
        public
        returns(bool)
    {
        _actionChecks();
        require(_sellOnDutchX(_executionClaimId,
                              _executionClaimOwner,
                              _sellToken,
                              _buyToken,
                              _sellAmount),
            "ActionSellOnDutchX._sellOnDutchX failed"
        );
        return true;
    }
}
