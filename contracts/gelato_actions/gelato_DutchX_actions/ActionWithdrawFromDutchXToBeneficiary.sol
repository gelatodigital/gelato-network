pragma solidity ^0.5.10;

import '../gelato_actions_base/GelatoActionsStandard.sol'
import '../../gelato_dapp_interfaces/gelato_DutchX/gelato_DutchX_base/GelatoDutchXStandard.sol'
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol'

contract ActionWithdrawFromDutchXToBeneficiary is GelatoActionsStandard, GelatoDutchXStandard, ReentrancyGuard {

    string constant public actionSignature
        = "withdrawFromDutchX(uint256, address, address, address, address, uint256, uint256)";

    constructor(address _GelatoCore,
                address _DutchX,
                uint256 _actionGas
    )
        public
        GelatoActionsStandard(_GelatoCore, actionSignature, _actionGas)
        GelatoDutchXStandard(_DutchX)
    {}

    event LogWithdrawFromDutchX(uint256 indexed executionClaimId,
                                address executionClaimOwner,
                                address indexed beneficiary,
                                address sellToken,
                                address indexed buyToken,
                                uint256 auctionIndex
                                uint256 withdrawAmount,
    );)

    function withdrawFromDutchX(uint256 _executionClaimId,
                                address _executionClaimOwner,
                                address _beneficiary,
                                address _sellToken,
                                address _buyToken,
                                uint256 _auctionIndex,
                                uint256 _withdrawAmount
    )
        nonReentrant
        external
        returns(bool)
    {
        super._action();
        require(_withdrawFromDutchX(_sellToken,
                                    _buyToken,
                                    _auctionIndex,
                                    _withdrawAmount),
            "ActionSellWithdrawDutchX._withdrawFromDutchX failed"
        );
        ERC20(_buyToken).safeTransfer(_beneficiary, withdrawAmount);
        emit LogWithdrawFromDutchX(_executionClaimId,
                                   _executionClaimOwner,
                                   _beneficiary,
                                   _sellToken,
                                   _buyToken,
                                   _auctionIndex,
                                   _withdrawAmount,
        )
        return true;
    }
}

