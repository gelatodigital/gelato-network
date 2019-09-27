pragma solidity ^0.5.10;

import './GTAI_standards/IcedOut/IcedOutOwnable.sol';
import './GTAI_standards/GTA_registry/ownable_registry/GelatoTriggerRegistryOwnable.sol';
import './GTAI_standards/GTA_registry/ownable_registry/GelatoActionRegistryOwnable.sol';

contract GTAIAggregator is IcedOutOwnable,
                           GelatoTriggerRegistryOwnable,
                           GelatoActionRegistryOwnable
{

    constructor(address payable _gelatoCore,
                uint256 _gtaiGasPrice,
                uint256 _automaticTopUpAmount
    )
        IcedOutOwnable(_gelatoCore,
                       _gtaiGasPrice,
                       _automaticTopUpAmount
        )
        public
    {}


    // _______________ API FOR DAPP TRIGGER ACTION MINTING____________________
    event LogActivation(uint256 executionClaimId,
                        address indexed executionClaimOwner,
                        address indexed trigger,
                        address indexed action
    );

    function activateTA(address _trigger,
                        bytes calldata _triggerParams,
                        address _action,
                        bytes calldata _actionParams
    )
        onlyRegisteredTriggers(_trigger)
        onlyRegisteredActions(_action)
        external
        payable
        returns(bool)
    {
        /// @dev Calculations for charging the msg.sender/user
        uint256 prepaidExecutionFee = _getExecutionClaimPrice(_action);
        require(msg.value == prepaidExecutionFee,
            "GTAIAggregator.dutchXTimedSellAndWithdraw: prepaidExecutionFee failed"
        );

        // _________________Minting_____________________________________________
        uint256 nextExecutionClaimId = _getNextExecutionClaimId();
        // Trigger-Action Payloads
        bytes memory triggerPayload = abi.encodeWithSelector(_getTriggerSelector(_trigger),
                                                             nextExecutionClaimId,
                                                             _triggerParams
        );
        bytes memory actionPayload = abi.encodeWithSelector(_getActionSelector(_action),
                                                            nextExecutionClaimId,
                                                            msg.sender,
                                                            _actionParams
        );
        _mintExecutionClaim(nextExecutionClaimId,
                            msg.sender,  // executionClaimOwner
                            _trigger,
                            triggerPayload,
                            _action,
                            actionPayload
        );
        emit LogActivation(nextExecutionClaimId,
                            msg.sender,
                           _trigger,
                           _action
        );

        return true;
        // =========================
    }

    //___________________ Chained Execution Claim Minting _____________________
    event LogChainedActivation(address indexed minter,
                               uint256 executionClaimId,
                               address indexed executionClaimOwner,
                               address trigger,
                               address indexed action
    );

    function activateChainedTA(address _executionClaimOwner,
                               address _chainedTrigger,
                               bytes calldata _chainedTriggerPayload,
                               address _chainedAction,
                               bytes calldata _chainedActionPayload
    )
        msgSenderIsRegisteredAction()
        onlyRegisteredTriggers(_chainedTrigger)
        onlyRegisteredActions(_chainedAction)
        external
        returns(bool)
    {
        uint256 chainedExecutionClaimId = _getNextExecutionClaimId();
        _mintExecutionClaim(chainedExecutionClaimId,
                            _executionClaimOwner,
                            _chainedTrigger,
                            _chainedTriggerPayload,
                            _chainedAction,
                            _chainedActionPayload
        );
        emit LogChainedActivation(msg.sender,
                                  chainedExecutionClaimId,
                                  _executionClaimOwner,
                                  _chainedTrigger,
                                  _chainedAction
        );
        return true;
    }
    // ================
}


