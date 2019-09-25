pragma solidity ^0.5.10;

contract ChainedMintingGTAIData {

    struct ChainedTAData {
        address trigger;
        bytes triggerPayload;
        address action;
        bytes actionPayload;
        uint256 actionGasStipend;
    }

    // ActionMinterContract => Data for minting chained execution claim
    mapping(address => ChainedTAData) public chainedTAData;

    function _registerChainedTAData(address _chainedMinterAction,
                                    address _trigger,
                                    bytes memory _triggerPayload,
                                    address _action,
                                    bytes memory _actionPayload,
                                    uint256 _actionGasStipend
    )
        internal
    {
        chainedTAData[_chainedMinterAction] = ChainedTAData(_trigger,
                                                            _triggerPayload,
                                                            _action,
                                                            _actionPayload,
                                                            _actionGasStipend
        );
    }

    function _deregisterChainedTAData(address _chainedMinterAction)
        internal
    {
        delete chainedTAData[_chainedMinterAction];
    }
}

