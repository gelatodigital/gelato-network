pragma solidity ^0.5.10;

import './gelato_dappInterface_standards/ownable/IcedOutOwnable.sol';
import './gelato_dappInterface_standards/ownable/GelatoTriggerRegistryOwnable.sol';
import './gelato_dappInterface_standards/ownable/GelatoActionRegistryOwnable.sol';
import '../gelato_actions/gelato_action_standards/IGelatoAction.sol.';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';


contract GelatoAggregator is IcedOutOwnable,
                             GelatoTriggerRegistryOwnable,
                             GelatoActionRegistryOwnable
{
    using SafeERC20 for ERC20;

    // **************************** Events ******************************
    event LogNewOrder(uint256 indexed executionClaimOwner,
                      uint256 executionClaimId
                      address indexed triggerAddress,
                      bytes4 triggerSelector,
                      address indexed actionAddress,
                      bytes4 actionSelector
    );
    event LogWithdrawComplete(uint256 indexed executionClaimId,
                              address indexed seller,
                              address buyToken,
                              uint256 sellAmount,
                              uint256 withdrawAmount
    );
    event LogGas(uint256 gas1, uint256 gas2);
    // **************************** Events END ******************************


    constructor(address payable _gelatoCore,
                uint256 _interfaceGasPrice,
                uint256 _automaticTopUpAmount
    )
        IcedOutOwnable(_gelatoCore,
                       _interfaceGasPrice,
                       _automaticTopUpAmount)
        public
    {}


    // **************************** DutchX Timed Sell Orders ******************
    function dutchXTimedSellAndWithdraw(address _trigger,
                                        bytes4 _triggerSelector,
                                        uint256 _executionTime
                                        address _action,
                                        bytes4 _actionSelector,
                                        address _sellToken,
                                        address _buyToken,
                                        uint256 _sellAmount
    )
        onlyRegisteredTriggers(_trigger, _triggerSelector)
        onlyRegisteredActions(_action, _actionSelector)
        matchingGelatoCore(_trigger)
        matchingGelatoCore(_action)
        matchingTriggerSelector(_trigger, _triggerSelector)
        matchingActionSelector(_action, _actionSelector)
        actionHasERC20Allowance(_action, _sellToken, msg.sender, _sellAmount)
        actionConditionsFulfilled(_sellToken, _buyToken)
        public
        payable
        returns(bool)
    {
        require(_executionTime.add(10 minutes) >= now,
            "GelatoDutchX.dutchXTimedSellAndWithdraw: _executionTime failed"
        );
        require(_buyToken != address(0),
            "GelatoDutchX.dutchXTimedSellAndWithdraw: _buyToken zero-value"
        );

        /// @dev Calculations for charging the msg.sender/user
        uint256 prepaidExecutionFee = _getExecutionClaimPrice(_action);
        require(msg.value == prepaidExecutionFee,
            "GelatoDutchX.dutchXTimedSellAndWithdraw: prepaidExecutionFee failed"
        );

        // _________________Minting_____________________________________________
        uint256 nextExecutionClaimId = _getNextExecutionClaimId();
        // Trigger-Action Payloads
        bytes memory triggerPayload = abi.encodeWithSelector(_triggerSelector,
                                                             nextExecutionClaimId,
                                                             _executionTime
        );
        uint256 actionGasStipend = IGelatoAction(_action).actionGasStipend();
        bytes memory actionPayload = abi.encodeWithSelector(_actionSelector,
                                                            nextExecutionClaimId,
                                                            actionGasStipend,
                                                            _sellToken,
                                                            _buyToken,
                                                            _sellAmount,
                                                            prepaidExecutionFee
        );

        _mintExecutionClaim(nextExecutionClaimId,
                            msg.sender,  // executionClaimOwner
                            _triggerAddress,  // dappInterface
                            triggerPayload,
                            _actionAddress,
                            actionPayload,
                            actionGasStipend
        );
        emit LogNewOrder(msg.sender,
                         nextExecutionClaimId,
                         _triggerAddress,
                         _triggerSelector,
                         _actionAddress,
                         _actionSelector
        );
        // =========================

        return true;
    }
    // **************************** DutchX Timed Sell Orders END

    // Check if execDepositAndSell is executable
    function execDepositAndSellTrigger(uint256 _executionClaimId,
                                       address _sellToken,
                                       address _buyToken,
                                       uint256 _sellAmount,
                                       uint256 _executionTime,
                                       uint256 _orderStateId
    )
        external
        view
        returns (bool)
    {

        // Check the condition: Execution Time
        require(_executionTime <= now,
            "IcedOut Time Condition: Function called scheduled execution time"
        );

        // Check if interface has enough funds to sell on the Dutch Exchange
        require(ERC20(_sellToken).balanceOf(address(this)) >= _sellAmount,
            "GelatoInterface.execute: ERC20(sellToken).balanceOf(address(this)) !>= subOrderSize"
        );

        // Fetch OrderState
        OrderState memory orderState = orderStates[_orderStateId];

        // Fetch current DutchX auction values to analyze past auction participation
        (uint256 newAuctionIndex, , bool newAuctionIsWaiting) = getAuctionValues(_sellToken, _buyToken);

        // Goal: prevent doubly participating in same auction
        // CASE 1: DONT SELL - EDGE CASE: indices out of sync
        // Ensure that currentAuctionIndex is at most 1 below lastParticipatedAuctionIndex
        // The 'if' is to avoid an underflow for default 0 lastParticipatedAuctionIndex
        if (orderState.lastParticipatedAuctionIndex > 0) {
            // "GelatoDutchX.execDepositAndSell Case 1: Fatal error, Gelato auction index ahead of dutchExchange auction index"
            if(newAuctionIndex < orderState.lastParticipatedAuctionIndex.sub(1))
            {
                return false;
            }
        }

        // CASE 2: DEPENDS
        // We already have funds attributed to the newAuctionIndex
        if (newAuctionIndex == orderState.lastParticipatedAuctionIndex) {
            // Case 2a - SELL: our funds went into the newAuctionIndex but since they were invested
            //  during its waiting period (orderState.lastAuctionWasWaiting) and that auction has started
            //  in the meantime (!newAuctionIsWaiting) we can sell into sellVolumesNext.
            if (orderState.lastAuctionWasWaiting && !newAuctionIsWaiting) {
                return true;
            }
            // Case 2b - DONT SELL: because either we would doubly invest during same waiting period or
            //  we have an auction index out of sync error.
            else
            {
                return false;
            }
        }

        // CASE 3: SELL - last participated auction has cleared
        // Our funds went into the previous auction index
        // We can now sell again into the current auction index.
        else if (newAuctionIndex > orderState.lastParticipatedAuctionIndex) {
            return true;
        }

        // CASE 4: DONT SELL - EDGE CASE: unhandled errors
        else {
            return false;
        }
    }

    // Test if execWithdraw is executable
    function execWithdrawTrigger(uint256 _executionClaimId,
                               address _sellToken,
                               address _buyToken,
                               uint256 _sellAmount,
                               uint256 _lastParticipatedAuctionIndex)
        external
        view
        returns (bool)
    {
        // Decode payload
        // (uint256 executionClaimId, address sellToken, address buyToken, uint256 amount, uint256 lastParticipatedAuctionIndex) = abi.decode(_memPayload, (uint256, address, address, uint256, uint256));

        // Check if auction in DutchX closed
        uint256 num;
        uint256 den;
        (num, den) = dutchExchange.closingPrices(_sellToken,
                                                _buyToken,
                                                _lastParticipatedAuctionIndex
        );

        // Check if the last auction the seller participated in has cleared
        // DEV Test: Are there any other possibilities for den being 0 other than when the auction has not yet cleared?
        require(den != 0,
            "den != 0, Last auction did not clear thus far, you have to wait"
        );

        // Callculate withdraw amount
        uint256 withdrawAmount = _sellAmount.mul(num).div(den);

        // // All checks passed
        return true;
    }

    // UPDATE-DELETE
    // ****************************  execDepositAndSell(executionClaimId) *********************************
    /**
     * DEV: Called by the execute func in GelatoCore.sol
     * Aim: Post sellOrder on the DutchExchange via depositAndSell()
     */
    function execDepositAndSellAction(uint256 _executionClaimId,
                                      address _sellToken,
                                      address _buyToken,
                                      uint256 _sellAmount,
                                      uint256 _executionTime,
                                      uint256 _prepaidExecutionFeeAmount,
                                      uint256 _orderStateId
    )
        external
    {
        // Step1: Checks for execution safety
        // Make sure that gelatoCore is the only allowed caller to this function.
        // Executors will call this execute function via the Core's execute function.
        require(msg.sender == address(gelatoCore),
            "GelatoDutchX.execDepositAndSell: msg.sender != gelatoCore instance address"
        );

        // Fetch orderState
        OrderState storage orderState = orderStates[_orderStateId];

        // Fetch token owner from gelato core
        address tokenOwner = gelatoCore.ownerOf(_executionClaimId);

        // Fetch current DutchX auction values to analyze past auction participation
        // Update Order State
        uint256 nextParticipationAuctionIndex;
        (, nextParticipationAuctionIndex, orderState.lastAuctionWasWaiting) = getAuctionValues(_sellToken,
                                                                                               _buyToken
        );

        // ### EFFECTS ###
        orderState.lastParticipatedAuctionIndex = nextParticipationAuctionIndex;


        uint256 actualSellAmount;
        {
            uint256 dutchXFee;
            // Update sellOrder.amount so when an executor calls execWithdraw, the seller receives withdraws the correct amount given sellAmountMinusFee
            (actualSellAmount, dutchXFee) = _calcActualSellAmount(_sellAmount);

            emit LogActualSellAmount(_executionClaimId,
                                    _sellAmount,
                                    actualSellAmount,
                                    dutchXFee
            );

            // ### EFFECTS END ###

            // INTERACTION: sell on dutchExchange
            _depositAndSell(_sellToken, _buyToken, _sellAmount);
            // INTERACTION: END
        }

        // Mint new token
        {
            // Fetch next executionClaimId
            uint256 nextExecutionClaimId = getNextExecutionClaimId();

            // Create Trigger Payload
            bytes memory triggerPayload = abi.encodeWithSignature(execWithdrawTriggerString,
                                                                  nextExecutionClaimId,
                                                                  _sellToken,
                                                                  _buyToken,
                                                                  actualSellAmount,
                                                                  nextParticipationAuctionIndex
            );

            // Create Action Payload
            bytes memory actionPayload = abi.encodeWithSignature(execWithdrawActionString,
                                                                 nextExecutionClaimId,
                                                                 _sellToken,
                                                                 _buyToken,
                                                                 actualSellAmount,
                                                                 nextParticipationAuctionIndex
            );

            // Mint new withdraw token
            mintExecutionClaim(address(this), triggerPayload, address(this), actionPayload, execWithdrawGas, tokenOwner);

        }
        // ********************** Step7: Execution Logic END **********************

    }




    // **************************** IcedOut execute(executionClaimId) END *********************************

    // DELETE
    // ****************************  execWithdraw(executionClaimId) *********************************
    // Withdraw function executor will call
    function execWithdrawAction(uint256 _executionClaimId,
                                address _sellToken,
                                address _buyToken,
                                uint256 _sellAmount,
                                uint256 _lastParticipatedAuctionIndex
    )
        external
    {
        // Step1: Checks for execution safety
        // Make sure that gelatoCore is the only allowed caller to this function.
        // Executors will call this execute function via the Core's execute function.
        require(msg.sender == address(gelatoCore),
            "GelatoDutchX.execWithdraw: msg.sender != gelatoCore instance address"
        );

        // Fetch owner of execution claim
        address tokenOwner = gelatoCore.ownerOf(_executionClaimId);

        // Get auction closing prices from dutchX
        (uint256 num, uint256 den) = dutchExchange.closingPrices(_sellToken, _buyToken, _lastParticipatedAuctionIndex);

        // Calculate withdrawAmount of token Owner
        uint256 withdrawAmount = _sellAmount.mul(num).div(den);

        // Withdraw tokens on behalf of user
        _withdraw(tokenOwner,
                  _sellToken,
                  _buyToken,
                  _lastParticipatedAuctionIndex,
                  withdrawAmount
        );

        // Event emission
        emit LogWithdrawComplete(_executionClaimId,
                                 tokenOwner,
                                 _buyToken,
                                 _sellAmount,
                                 withdrawAmount
        );


    }


    // **************************** Extra functions *********************************
    // Allows sellers to cancel their deployed orders
    // @🐮 create cancel helper on IcedOut.sol

    // Front end has to save all necessary variables and input them automatically for user
    function cancelOrder(address _triggerAddress,
                         bytes calldata _triggerPayload,
                         address _actionAddress,
                         bytes calldata _actionPayload,
                         uint256 _actionMaxGas,
                         uint256 _executionClaimId
    )
        external
        returns(bool)
    {

        address sellToken;
        uint256 amount;
        uint256 prepaidExecutionFeeAmount;
        {
            // Check that execution claim has the correct funcSelector
            (bytes memory memPayload, bytes4 funcSelector) = decodeWithFunctionSignature(_actionPayload);

            // #### CHECKS ####
            // @DEV check that we are dealing with a execDepositAndSell claim
            require(funcSelector == bytes4(keccak256(bytes(execDepositAndSellActionString))), "Only execDepositAndSell claims can be cancelled");

            address buyToken;
            // Decode actionPayload to reive prepaidExecutionFeeAmount
            (, sellToken, buyToken, amount, , prepaidExecutionFeeAmount, ) = abi.decode(memPayload, (uint256, address, address, uint256, uint256, uint256, uint256));

            // address seller = gelatoCore.ownerOf(_executionClaimId);
            address tokenOwner = gelatoCore.ownerOf(_executionClaimId);

            // Only Execution Claim Owner can cancel
            //@DEV We could add that the interface owner can also cancel an execution claim to avoid having oustanding claims that might never get executed. Discuss
            require(msg.sender == tokenOwner, "Only the executionClaim Owner can cancel the execution");

            // // #### CHECKS END ####

            // ****** EFFECTS ******
            // Emit event before deletion/burning of relevant variables
            emit LogOrderCancelled(_executionClaimId, _executionClaimId, tokenOwner);
        }

        // Cancel both execution Claims on core
        // ** Gelato Core interactions **
        gelatoCore.cancelExecutionClaim(_triggerAddress,
                                        _triggerPayload,
                                        _actionAddress,
                                        _actionPayload,
                                        _actionMaxGas,
                                        address(this),
                                        _executionClaimId);
        // ** Gelato Core interactions END **

        // ****** EFFECTS END ******

        // ****** INTERACTIONS ******
        // transfer sellAmount back from this contracts ERC20 balance to seller
        // Refund user the given prepaidExecutionFee amount!!!
        msg.sender.transfer(prepaidExecutionFeeAmount);

        // Transfer ERC20 Tokens back to seller
        ERC20(sellToken).safeTransfer(msg.sender, amount);

        // // ****** INTERACTIONS END ******

        // Success
        return true;
    }


    // **************************** Helper functions END *********************************


}


