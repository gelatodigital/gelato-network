pragma solidity ^0.6.2;

import "../one_offs/ActionERC20TransferFrom.sol";
import "../../../conditions/eth_utils/eth_time/ConditionTimestampPassed.sol";
import "../../../gelato_core/interfaces/IGelatoCore.sol";
import "../../../external/SafeMath.sol";
import "../../../external/Address.sol";

contract ActionChainedTimedERC20TransferFrom is ActionERC20TransferFrom {
    using SafeMath for uint256;
    using Address for address;

    // ActionSelector public state variable np due to this.actionSelector constant issue
    function actionSelector() public pure override virtual returns(bytes4) {
        return ActionChainedTimedERC20TransferFrom.action.selector;
    }

    function action(
        // Standard Action Params
        address[2] calldata _userAndProxy,
        // Specific Action Params
        address[2] calldata _sendTokenAndDesination,
        uint256 _sendAmount,
        // ChainedMintingParams
        address[2] calldata _selectedProviderAndExecutor,
        address[2] calldata _conditionTimestampPassedAndThisAction,
        bytes calldata _conditionTimestampPassedPayload,
        // Special Param
        uint256 _timeOffset
    )
        external
        virtual
    {
        // Internal Call: ActionERC20TransferFrom.action()
        super.action(_userAndProxy, _sendTokenAndDesination, _sendAmount);

        // Decode: ConditionTimestampPassed Payload and update value
        uint256 currentDueDate = abi.decode(_conditionTimestampPassedPayload, (uint256));
        uint256 nextDueDate = currentDueDate.add(_timeOffset);

        // Encode: Update ConditionTimestampPassed Payload
        bytes memory nextConditionTimestampPassedPayload = abi.encodeWithSelector(
            ConditionTimestampPassed.reached.selector,
            nextDueDate
        );

        // Encode: updated ActionChainedTimedERC20TransferFrom payload
        bytes memory actionPayload = abi.encodeWithSelector(
            ActionChainedTimedERC20TransferFrom.action.selector,
            _userAndProxy,
            _sendTokenAndDesination,
            _sendAmount,
            _selectedProviderAndExecutor,
            _conditionTimestampPassedAndThisAction,
            nextConditionTimestampPassedPayload,
            _timeOffset
        );

        // Mint: ExecutionClaim Chain continues with Updated Payloads
        IGelatoCore(0x40134bf777a126B0E6208e8BdD6C567F2Ce648d2).mintExecutionClaim(
            _selectedProviderAndExecutor,
            _conditionTimestampPassedAndThisAction,
            nextConditionTimestampPassedPayload,
            actionPayload,
            nextDueDate + 3 days  // executionClaimExpiryDate: max 3 day delay
        );
    }

    // ======= ACTION CONDITIONS CHECK =========
    // Overriding and extending GelatoActionsStandard's function (optional)
    function actionConditionsCheck(bytes calldata _actionPayload)
        external
        view
        override
        virtual
        returns(string memory)  // actionCondition
    {
        // Decode: Calldata Array actionPayload without Selector
        (address[2] memory _userAndProxy,
         address[2] memory _sendTokenAndDesination,
         uint256 _sendAmount,
         address[2] memory _selectedProviderAndExecutor,
         address[2] memory _conditionTimestampPassedAndThisAction,
         bytes memory _conditionTimestampPassedPayload,
         uint256 timeOffset) = abi.decode(
            _actionPayload[4:],
            (address[2],address[2],uint256,address[2],address[2],bytes,uint256)
        );

        // Check: ActionERC20TransferFrom._actionConditionsCheck
        string memory baseActionCondition = super._actionConditionsCheck(
            _userAndProxy,
            _sendTokenAndDesination,
            _sendAmount
        );

        // If: Base actionCondition: NOT OK => Return
        if (
            keccak256(abi.encodePacked(baseActionCondition))
            != keccak256(abi.encodePacked("ok"))
        )
            return baseActionCondition;

        // Else: Check and Return current contract actionCondition
        return _actionConditionsCheck(
            _selectedProviderAndExecutor,
            _conditionTimestampPassedAndThisAction,
            _conditionTimestampPassedPayload,
            timeOffset
        );
    }

    function _actionConditionsCheck(
        address[2] memory _selectedProviderAndExecutor,
        address[2] memory _conditionTimestampPassedAndThisAction,
        bytes memory _conditionTimestampPassedPayload,
        uint256 _timeOffset
    )
        internal
        view
        virtual
        returns(string memory)  // actionCondition
    {
        this;
        _selectedProviderAndExecutor;
        _conditionTimestampPassedAndThisAction;
        _conditionTimestampPassedPayload;
        _timeOffset;
        // STANDARD return string to signal actionConditions Ok
        return "ok";
    }
}
