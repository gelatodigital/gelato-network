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
    function actionSelector() external pure override virtual returns(bytes4) {
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
        uint256 _executionClaimExpiryDate,
        // Special Param
        uint256 _timeOffset
    )
        external
        virtual
    {
        // Call to ActionERC20TransferFrom.action()
        super.action(_userAndProxy, _sendTokenAndDesination, _sendAmount);

        // Update ConditionTimestampPassed payload params
        uint256 _dueDate =  abi.decode(_conditionTimestampPassedPayload, (uint256));
        bytes memory newConditionTimestampPassedPayload = abi.encodeWithSelector(
            ConditionTimestampPassed.reached.selector,
            _dueDate.add(_timeOffset)
        );

        // ABI Encode actionPayload for minting on GelatoCore
        bytes memory actionPayload = abi.encodeWithSelector(
            ActionChainedTimedERC20TransferFrom.action.selector,
            _userAndProxy,
            _sendTokenAndDesination,
            _sendAmount,
            _selectedProviderAndExecutor,
            _conditionTimestampPassedPayload,
            _executionClaimExpiryDate,
            _timeOffset
        );

        // Mint chained claim
        IGelatoCore(0x35b9b372cF07B2d6B397077792496c61721B58fa).mintExecutionClaim(
            _selectedProviderAndExecutor,
            _conditionTimestampPassedAndThisAction,
            newConditionTimestampPassedPayload,
            actionPayload,
            _executionClaimExpiryDate
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
        (address[2] memory _userAndProxy,
         address[2] memory _sendTokenAndDesination,
         uint256 _sendAmount,
         address[2] memory _selectedProviderAndExecutor,
         address[2] memory _conditionTimestampPassedAndThisAction,
         ,  // bytes _conditionTimestampPassedPayload
         uint256 executionClaimExpiryDate,
         uint256 timeOffset) = abi.decode(
            _actionPayload[4:],
            (address[2],address[2],uint256,address[2],address[2],bytes,uint256,uint256)
        );
        // Check ActionERC20TransferFrom._actionConditionsCheck
        string memory baseActionCondition = super._actionConditionsCheck(
            _userAndProxy,
            _sendTokenAndDesination,
            _sendAmount
        );
        if (
            keccak256(abi.encodePacked(baseActionCondition))
            != keccak256(abi.encodePacked("ok"))
        )
            return baseActionCondition;

        // Check chained minting conditions
        return _actionConditionsCheck(
            _selectedProviderAndExecutor,
            _conditionTimestampPassedAndThisAction,
            executionClaimExpiryDate,
            timeOffset
        );
    }

    function _actionConditionsCheck(
        address[2] memory _selectedProviderAndExecutor,
        address[2] memory _conditionTimestampPassedAndThisAction,
        uint256 _executionClaimExpiryDate,
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
        _executionClaimExpiryDate;
        _timeOffset;
        // STANDARD return string to signal actionConditions Ok
        return "ok";
    }

    // ============ API for FrontEnds ===========
    function getUsersSendTokenBalance(
        // Standard Action Params
        address[2] calldata _userAndProxy,
        // Specific Action Params
        address[2] calldata _sendTokenAndDesination,
        uint256,
        // ChainedMintingParams
        address[2] calldata,
        address[2] calldata,
        bytes calldata,
        uint256,
        uint256
    )
        external
        view
        virtual
        returns(uint256)
    {
        return super.getUsersSendTokenBalance(_userAndProxy, _sendTokenAndDesination, 0);
    }
}
