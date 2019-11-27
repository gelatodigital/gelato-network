pragma solidity ^0.5.10;

interface IGelatoUserProxy {
    function getUser() external view returns(address payable);
    function getGelatoCore() external view returns(address payable);
    function setGelatoCore(address payable _gelatoCore) external;
    function execute(address payable _action, bytes calldata _actionPayloadWithSelector)
        external
        payable
        returns(bool success, bytes memory returndata);
}