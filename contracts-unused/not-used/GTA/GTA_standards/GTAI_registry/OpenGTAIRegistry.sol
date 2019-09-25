pragma solidity ^0.5.10;

import './IGTAIRegistry.sol';

contract OpenGTAIRegistry is IGTAIRegistry
{
    mapping(address => bool) public registeredGTAIs;

    // ____________ Register as GTAI ____________
    event LogGTAIRegistered(address indexed _gtai);
    function registerAsGTAI()
        external
    {
        require(registeredGTAIs[msg.sender],
            "OpenGTAIRegistry.registerAsGTAI: already registered"
        );
        registeredGTAIs[msg.sender] = true;
        emit LogGTAIRegistered(msg.sender);
    }
    // ===========

    // ____________ Deregister as GTAI ___________
    event LogGTAIDeregistered(address indexed _gtai);
    function deregisterAsGTAI()
        external
    {
        require(registeredGTAIs[msg.sender],
            "OpenGTAIRegistry.deregisterAsGTAI: already unregistered"
        );
        registeredGTAIs[msg.sender] = false;
        emit LogGTAIDeregistered(msg.sender);
    }
    // ===========

    // ____________ Standard Checks _____________________________________
    modifier msgSenderIsRegisteredGTAI() {
        require(registeredGTAIs[msg.sender],
            "OpenGTAIRegistry.msgSenderIsRegisteredGTAI: failed"
        );
        _;
    }
    // ===========

}