pragma solidity ^0.5.10;

import "@openzeppelin/upgrades/contracts/Initializable.sol";

contract GelatoActionsStandard is Initializable
{
    /// @dev non-deploy base contract
    constructor() internal {}
    
    bytes4 internal actionSelector;
    uint256 internal actionGasStipend;

    function getActionSelector() external view returns(bytes4) {return actionSelector;}
    function getActionGasStipend() external view returns(uint256) {return actionGasStipend;}

    function _initialize(string memory _actionSignature,
                         uint256 _actionGasStipend
    )
        internal
        initializer
    {
        actionSelector = bytes4(keccak256(bytes(_actionSignature)));
        actionGasStipend = _actionGasStipend;
    }
}
