pragma solidity ^0.5.10;

interface IIcedOutOwnable {
    function acceptEther() external payable;
    function selectExecutor(address payable _executor) external;
    function setGTAIGasPrice(uint256 _gtaiGasPrice) external;
    function topUpBalanceOnGelato() external payable;
    function withdrawBalanceFromGelato(uint256 _withdrawAmount) external;
    function withdrawBalanceToOwner(uint256 _withdrawAmount) external;
    function withdrawBalanceFromGelatoToOwner(uint256 _withdrawAmount) external;
}