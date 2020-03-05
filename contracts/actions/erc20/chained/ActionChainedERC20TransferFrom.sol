pragma solidity ^0.6.2;

import "../one_offs/ActionERC20TransferFrom.sol";
import "../../../gelato_core/interfaces/IGelatoCore.sol";
import "../../../external/Address.sol";

contract ActionChainedERC20TransferFrom is ActionERC20TransferFrom {
    using Address for address;

    // ActionSelector public state variable np due to this.actionSelector constant issue
    function actionSelector() external pure override virtual returns(bytes4) {
        return ActionChainedERC20TransferFrom.action.selector;
    }

    // ActionGas
    uint256 public actionGasChainedTransferFrom = 450000;
    function getActionGas() external view override virtual returns(uint256) {
        return actionGasChainedTransferFrom;
    }
    function setActionGas(uint256 _actionGas) external override virtual onlyOwner {
        actionGasChainedTransferFrom = _actionGas;
    }

    // GelatoCore for chained minting
    address public constant gelatoCore = 0x35b9b372cF07B2d6B397077792496c61721B58fa;

    function action(
        // Standard Action Params
        address[2] calldata _userAndProxy,
        // Specific Action Params
        address[2] calldata _sendTokenAndDesination,
        uint256 _sendAmount,
        // ChainedMintingParams
        address[2] calldata selectedProviderAndExecutor,
        address[2] calldata conditionAndAction,
        bytes calldata _conditionPayload,
        bytes calldata _actionPayload,
        uint256 _executionClaimExpiryDate
    )
        external
        virtual
    {
        // Call to ActionERC20TransferFrom.action()
        super.action(_userAndProxy, _sendTokenAndDesination, _sendAmount);
        // Mint chained claim
        IGelatoCore(gelatoCore).mintExecutionClaim(
            selectedProviderAndExecutor,
            conditionAndAction,
            _conditionPayload,
            _actionPayload,
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
         address[2] memory selectedProviderAndExecutor,
         address[2] memory conditionAndAction,
         ,  // bytes conditionPayload
         ,  // bytes actionPayload
         uint256 executionClaimExpiryDate) = abi.decode(
            _actionPayload[4:],
            (address[2],address[2],uint256,address[2],address[2],bytes,bytes,uint256)
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
            selectedProviderAndExecutor,
            conditionAndAction,
            executionClaimExpiryDate
        );
    }

    function _actionConditionsCheck(
        address[2] memory selectedProviderAndExecutor,
        address[2] memory conditionAndAction,
        uint256 _executionClaimExpiryDate
    )
        internal
        view
        override
        returns(string memory)  // actionCondition
    {
        selectedProviderAndExecutor;
        conditionAndAction;
        _executionClaimExpiryDate;
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
        bytes calldata,
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
