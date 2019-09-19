pragma solidity ^0.5.10;

import '../gelato_actions_base/GelatoActionsStandard.sol'
import '../../gelato_dapp_interfaces/gelato_DutchX/gelato_DutchX_base/GelatoDutchXStandard.sol'
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol'

contract ActionSellOnDutchX is GelatoActionsStandard, GelatoDutchXStandard, ReentrancyGuard {

    string constant public actionSignature
        = "sellOnDutchX(uint256, address, address, uint256)";

    constructor(address _GelatoCore,
                address _DutchX,
                uint256 _actionGasStipend
    )
        public
        GelatoActionsStandard(_GelatoCore, actionSignature, _actionGasStipend)
        GelatoDutchXStandard(_DutchX)
    {}

    function sellOnDutchX(uint256 _executionClaimId,
                          address _sellToken,
                          address _buyToken,
                          uint256 _sellAmount
    )
        nonReentrant
        external
        returns(bool)
    {
        super._action();
        require(_sellOnDutchX(_executionClaimId,
                              gelatoCore.ownerOf(_executionClaimId),
                              _sellToken,
                              _buyToken,
                              _sellAmount),
            "ActionSellOnDutchX._sellOnDutchX failed"
        );
        return true;
    }
}
