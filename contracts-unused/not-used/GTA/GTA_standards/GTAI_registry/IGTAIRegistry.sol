pragma solidity ^0.5.10;

interface IGTAIRegistry {
    function registeredGTAIs(address _gtai) external view returns(bool);
    function registerAsGTAI() external;
    function deregisterAsGTAI() external;
}