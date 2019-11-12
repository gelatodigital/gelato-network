pragma solidity ^0.5.10;

//import '../../../0_gelato_interfaces/2_GTAI_interfaces/IMintingGTAI.sol';
//import '../../../0_gelato_interfaces/1_GTA_interfaces/gelato_trigger_interfaces/IGelatoTrigger.sol';
//import '../../../0_gelato_interfaces/1_GTA_interfaces/gelato_action_interfaces/IGelatoAction.sol';

contract GelatoChainedMintingStandard {
/*
    IMintingGTAI internal mintingGTAI;
    address internal chainedTrigger;
    address internal chainedAction;

    function getMintingGTAI() external view returns(address) {return address(mintingGTAI);}
    function getChainedTrigger() external view returns(address) {return chainedTrigger;}
    function getChainedAction() external view returns(address) {return chainedAction;}

    constructor(address _mintingGTAI,
                address _chainedTrigger,
                address _chainedAction
    )
        internal
    {
        mintingGTAI = IMintingGTAI(_mintingGTAI);
        chainedTrigger = _chainedTrigger;
        chainedAction = _chainedAction;
    }

    function _getChainedTriggerSelector()
        internal
        view
        returns(bytes4 chainedTriggerSelector)
    {
        chainedTriggerSelector = IGelatoTrigger(chainedTrigger).triggerSelector();
    }

    function _getChainedActionSelector()
        internal
        view
        returns(bytes4 chainedActionSelector)
    {
        chainedActionSelector = IGelatoAction(chainedAction).getActionSelector();
    }

    function _getChainedExecutionClaimLifespanCap(address _chainedAction)
        internal
        view
        returns(uint256 chainedExecutionClaimLifespanCap)
    {
        chainedExecutionClaimLifespanCap
            = mintingGTAI.getActionExecutionClaimLifespanCap(_chainedAction);
    }

    event LogGTAChainedMinting(address indexed user);

    function _activateChainedTAviaMintingGTAI(address _user,
                                              bytes memory _chainedTriggerPayload,
                                              bytes memory _chainedActionPayload
    )
        internal
        returns(bool)
    {
        uint256 chainedExecutionClaimLifespanCap
            = _getChainedExecutionClaimLifespanCap(chainedAction);
        mintingGTAI.activateChainedTA(_user,
                                      chainedTrigger,
                                      _chainedTriggerPayload,
                                      chainedAction,
                                      _chainedActionPayload,
                                      chainedExecutionClaimLifespanCap
        );
        emit LogGTAChainedMinting(_user);
        return true;
    }
    */
}
