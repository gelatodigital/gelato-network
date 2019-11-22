pragma solidity ^0.5.10;

interface IGelatoCore {
    // GelatoCoreAccounting
    function getMintingDepositPayable(address _action,
                                      address _selectedExecutor
    )
        external
        view
        returns(uint256);

    // GelatoCore
    function mintExecutionClaim(address _trigger,
                                bytes calldata _specificTriggerParams,
                                address _action,
                                bytes calldata _specificActionParams,
                                address payable _selectedExecutor

    )
        external
        payable;

}