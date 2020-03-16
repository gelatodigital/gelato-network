pragma solidity ^0.6.4;

import "../one_offs/ActionERC20TransferFrom.sol";
import "../../../conditions/eth_utils/eth_time/ConditionTimestampPassed.sol";
import "../../../gelato_core/interfaces/IGelatoCore.sol";
import "../../../gelato_core/interfaces/IGelatoExecutors.sol";
import "../../../external/SafeMath.sol";
import "../../../external/Address.sol";

contract ActionChainedTimedERC20TransferFromKovan is ActionERC20TransferFrom {
    using SafeMath for uint256;
    using Address for address;

    // ActionSelector public state variable np due to this.actionSelector constant issue
    function actionSelector() public pure override virtual returns(bytes4) {
        return ActionChainedTimedERC20TransferFromKovan.action.selector;
    }

    function action(
        // Standard Action Params
        address[2] calldata _userAndProxy,
        // Specific Action Params
        address[2] calldata _sendTokenAndDesination,
        uint256 _sendAmount,
        // ChainedMintingParams
        address[2] calldata _selectedProviderAndExecutor,
        address _actionChainedTimedERC20TransferFromKovan,
        uint256 _dueDate,
        // Special Param
        uint256 _timeOffset
    )
        external
        virtual
    {
        // Internal Call: ActionERC20TransferFrom.action()
        action(_userAndProxy, _sendTokenAndDesination, _sendAmount);

        // Decode: ConditionTimestampPassed Payload and update value
        uint256 nextDueDate = _dueDate.add(_timeOffset);

        // Encode: updated ActionChainedTimedERC20TransferFromKovan payload
        bytes memory actionPayload = abi.encodeWithSelector(
            ActionChainedTimedERC20TransferFromKovan.action.selector,
            _userAndProxy,
            _sendTokenAndDesination,
            _sendAmount,
            _selectedProviderAndExecutor,
            _actionChainedTimedERC20TransferFromKovan,
            nextDueDate,
            _timeOffset
        );

        // Mint: ExecutionClaim Chain continues with Updated Payloads
        IGelatoCore(0x40134bf777a126B0E6208e8BdD6C567F2Ce648d2).mintExecutionClaim(
            _selectedProviderAndExecutor,
            [address(0), _actionChainedTimedERC20TransferFromKovan],
            "",  // empty conditionPayload
            actionPayload,
            nextDueDate.add(3 days)  // Max 3 days delay, else automatic expiry
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
         address _actionChainedTimedERC20TransferFromKovan,
         uint256 _dueDate,
         uint256 timeOffset) = abi.decode(
            _actionPayload[4:],
            (address[2],address[2],uint256,address[2],address,uint256,uint256)
        );

        // Check: ActionERC20TransferFrom._actionConditionsCheck
        string memory baseActionCondition = _actionConditionsCheck(
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
            _actionChainedTimedERC20TransferFromKovan,
            _dueDate,
            timeOffset
        );
    }

    function _actionConditionsCheck(
        address[2] memory _selectedProviderAndExecutor,
        address _actionChainedTimedERC20TransferFromKovan,
        uint256 _dueDate,
        uint256 _timeOffset
    )
        internal
        view
        virtual
        returns(string memory)  // actionCondition
    {
        _actionChainedTimedERC20TransferFromKovan;

        if (_dueDate >= block.timestamp) return "NotOkTimestampDidNotPass";

        // Check ExecutionClaimExpiryDate maximum
        uint256 nextDueDate = _dueDate.add(_timeOffset);
        uint256 executorClaimLifespan = IGelatoExecutors(
            0x40134bf777a126B0E6208e8BdD6C567F2Ce648d2
        ).executorClaimLifespan(_selectedProviderAndExecutor[1]);

        if (nextDueDate > (now + executorClaimLifespan))
            return "ActionChainedTimedERC20TransferFromKovan._actionConditionsCheck: exp";

        // STANDARD return string to signal actionConditions Ok
        return "ok";
    }
}
