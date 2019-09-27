pragma solidity ^0.5.10;

import './GTAI_standards/IcedOut/IcedOutOwnable.sol';
import './GTAI_standards/GTA_registry/ownable_registry/GTARegistryOwnable.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';

contract GTAIAggregator is IcedOutOwnable,
                           GTARegistryOwnable
{
    using SafeERC20 for ERC20;

    constructor(address payable _gelatoCore,
                uint256 _gtaiGasPrice,
                uint256 _automaticTopUpAmount
    )
        IcedOutOwnable(_gelatoCore,
                       _gtaiGasPrice,
                       _automaticTopUpAmount
        )
        GTARegistryOwnable(_gelatoCore)
        public
    {}

    //___________________ Chained Execution Claim Minting _____________________
    event LogChainedExecutionClaimMinted(address indexed minter,
                                         uint256 executionClaimId,
                                         address indexed executionClaimOwner,
                                         address trigger,
                                         bytes4 triggerSelector,
                                         address indexed action,
                                         bytes4 actionSelector
    );

    function mintChainedExecutionClaim(address _executionClaimOwner,
                                       address _chainedTrigger,
                                       bytes4 _chainedTriggerSelector,
                                       bytes calldata _chainedTriggerPayload,
                                       address _chainedAction,
                                       bytes4 _chainedActionSelector,
                                       bytes calldata _chainedActionPayload
    )
        msgSenderIsRegisteredAction(_getActionSelector(msg.sender))
        external
        returns(bool)
    {
        _standardGTARegistryChecks(_chainedTrigger,
                                   _chainedAction,
                                   _chainedTriggerSelector,
                                   _chainedActionSelector,
                                   address(gelatoCore)
        );
        uint256 chainedExecutionClaimId = _getNextExecutionClaimId();
        _mintExecutionClaim(chainedExecutionClaimId,
                            _executionClaimOwner,
                            _chainedTrigger,
                            _chainedTriggerPayload,
                            _chainedAction,
                            _chainedActionPayload
        );
        emit LogChainedExecutionClaimMinted(msg.sender,
                                            chainedExecutionClaimId,
                                            _executionClaimOwner,
                                            _chainedTrigger,
                                            _chainedTriggerSelector,
                                            _chainedAction,
                                            _chainedActionSelector
        );
        return true;
    }
    // ================


    // _______________ APIs FOR DAPP TRIGGER ACTION MINTING____________________
    event LogNewOrder(uint256 executionClaimId,
                      address indexed executionClaimOwner,
                      address indexed trigger,
                      bytes4 triggerSelector,
                      address indexed action,
                      bytes4 actionSelector
    );


    // ******************** DutchX Timed Sell and CHAINED withdraw *****************
    /** @dev
      * Trigger: TriggerTimestampPassed.sol
      * Action:  ActionChainedDutchXSellMintWithdraw.sol
    */
    function dutchXTimedSellAndWithdraw(address _trigger,
                                        bytes4 _triggerSelector,
                                        uint256 _executionTime,
                                        address _action,
                                        bytes4 _actionSelector,
                                        address _beneficiary,
                                        address _sellToken,
                                        address _buyToken,
                                        uint256 _sellAmount
    )
        actionHasERC20Allowance(_action, _sellToken, msg.sender, _sellAmount)
        actionConditionsFulfilled(_action, abi.encode(_sellToken, _buyToken))
        onlyRegisteredTriggers(_trigger, _triggerSelector)
        onlyRegisteredActions(_action, _actionSelector)
        hasMatchingGelatoCore(address(gelatoCore))
        hasMatchingGelatoCore(address(gelatoCore))
        //matchingTriggerSelector(_trigger, _triggerSelector)
        //matchingActionSelector(_action, _actionSelector)
        public
        payable
        returns(bool)
    {
        /*_standardGTARegistryChecks(_trigger,
                                   _action,
                                   _triggerSelector,
                                   _actionSelector,
                                   address(gelatoCore)
        );*/
        require(_executionTime.add(10 minutes) >= now,
            "GTAIAggregator.dutchXTimedSellAndWithdraw: _executionTime failed"
        );
        require(_buyToken != address(0),
            "GTAIAggregator.dutchXTimedSellAndWithdraw: _buyToken zero-value"
        );

        /// @dev Calculations for charging the msg.sender/user
        uint256 prepaidExecutionFee = _getExecutionClaimPrice(_action);
        require(msg.value == prepaidExecutionFee,
            "GTAIAggregator.dutchXTimedSellAndWithdraw: prepaidExecutionFee failed"
        );

        // _________________Minting_____________________________________________
        uint256 nextExecutionClaimId = _getNextExecutionClaimId();
        // Trigger-Action Payloads
        bytes memory triggerPayload = abi.encodeWithSelector(_triggerSelector,
                                                             nextExecutionClaimId,
                                                             _executionTime
        );
        bytes memory actionPayload = abi.encodeWithSelector(_actionSelector,
                                                            nextExecutionClaimId,
                                                            msg.sender,
                                                          //  _beneficiary,
                                                            _sellToken,
                                                            _buyToken,
                                                            _sellAmount
        );
        _mintExecutionClaim(nextExecutionClaimId,
                            msg.sender,  // executionClaimOwner
                            _trigger,
                            triggerPayload,
                            _action,
                            actionPayload
        );
        emit LogNewOrder(nextExecutionClaimId,
                         msg.sender,
                         _trigger,
                         _triggerSelector,
                         _action,
                         _actionSelector
        );
        // =========================

        return true;
    }
    // ************* DutchX Timed Sell and CHAINED Withdraw END
}


