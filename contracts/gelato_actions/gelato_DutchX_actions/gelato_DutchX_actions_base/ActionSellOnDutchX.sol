pragma solidity ^0.5.10;

import '../../gelato_actions_base/GelatoActionsStandard.sol'
import 'contracts/gelato_actions/gelato_DutchX_actions/gelato_DutchX_actions_base/GelatoDutchXInterface.sol'

contract ActionSellOnDutchX is GelatoActionsStandard {

    string constant public actionSignature = "sellOnDutchX(address, address, uint256)";

    Gelato

    constructor(address _GelatoCore,
                address _DutchX,
                uint256 _actionGasStipend
    )
        public
        GelatoActionsStandard(_GelatoCore, actionSignature, _actionGasStipend)
        GelatoDutchXStandard(_DutchX)
    {}

    function sellOnDutchX(address _sellToken,
                          address _buyToken,
                          uint256 _sellAmount
    )
        external
    {
        super._action();
        require(_sellOnDutchX(_sellToken, _buyToken, _sellAmount),
            "ActionSellOnDutchX._sellOnDutchX failed"
        );
    }

}
