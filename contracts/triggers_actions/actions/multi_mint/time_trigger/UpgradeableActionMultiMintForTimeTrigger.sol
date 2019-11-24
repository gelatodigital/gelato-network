pragma solidity ^0.5.10;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "../../GelatoUpgradeableActionsStandard.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "../../../../gelato_core/IGelatoCore.sol";
import "../../../triggers/IGelatoTrigger.sol";

contract UpgradeableActionMultiMintForTimeTrigger is Initializable,
                                                     GelatoUpgradeableActionsStandard
{
    using SafeMath for uint256;

    IGelatoCore internal gelatoCore;

    function getGelatoCore() external view returns(IGelatoCore) {return gelatoCore;}

    function initialize(address _proxyAdmin,
                        uint256 _actionGasStipend,
                        address _gelatoCore
    )
        external
        initializer
    {
        myProxyAdmin = ProxyAdmin(_proxyAdmin);
        actionOperation = ActionOperation.proxydelegatecall;
        actionSelector = this.action.selector;
        actionGasStipend = _actionGasStipend;
        gelatoCore = IGelatoCore(_gelatoCore);
        UpgradeableActionMultiMintForTimeTrigger implementation
            = UpgradeableActionMultiMintForTimeTrigger(_getMyImplementationAddress());
        implementation.initialize(_proxyAdmin, _actionGasStipend, _gelatoCore);
        require(implementation.getGelatoCore() != IGelatoCore(0),
            "UpgradeableActionMultiMintForTimeTrigger.initialize: implementation init failed"
        );
    }

    modifier initialized() {
        require(gelatoCore != IGelatoCore(0),
            "UpgradeableActionMultiMintForTimeTrigger.initialized: failed"
        );
        _;
    }

    function action(// gelatoCore.mintExecutionClaim params
                    address _timeTrigger,
                    uint256 _startTime,  // will be encoded here
                    address _action,
                    bytes calldata _actionPayload,
                    address payable _selectedExecutor,
                    // MultiMintTimeBased params
                    uint256 _intervalSpan,
                    uint256 _numberOfMints
    )
            external
            payable
            initialized
        {
            uint256 mintingDepositPerMint
                = gelatoCore.getMintingDepositPayable(_action, _selectedExecutor);
            require(msg.value == mintingDepositPerMint.mul(_numberOfMints),
                "MultiMintTimeBased.multiMint: incorrect msg.value"
            );
            for (uint256 i = 0; i < _numberOfMints; i++)
            {
                uint256 timestamp = _startTime.add(_intervalSpan.mul(i));
                bytes memory triggerPayload
                    = abi.encodeWithSelector(
                        IGelatoTrigger(_timeTrigger).getTriggerSelector(),
                        timestamp
                );
                gelatoCore.mintExecutionClaim
                          .value(mintingDepositPerMint)
                          (_timeTrigger,
                           triggerPayload,
                           _action,
                           _actionPayload,
                           _selectedExecutor
                );
            }
        }
}