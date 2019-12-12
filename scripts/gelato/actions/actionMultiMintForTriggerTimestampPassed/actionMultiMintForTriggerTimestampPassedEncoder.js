// Javascript Ethereum API Library
import { utils } from "ethers";

export function getPayloadWithSelector(
  gelatoCore,
  selectedExecutor,
  timeTrigger,
  startTime,
  action,
  actionPayloadWithSelector,
  intervalSpan,
  numberOfMints
) {
  const actionMultiMintForTriggerTimestampPassedABI = [
    {
      name: "action",
      type: "function",
      inputs: [
        { type: "address", name: "_gelatoCore" },
        { type: "address", name: "_selectedExecutor" },
        { type: "address", name: "_timeTrigger" },
        { type: "uint256", name: "_startTime" },
        { type: "address", name: "_action" },
        { type: "bytes", name: "_actionPayloadWithSelector" },
        { type: "uint256", name: "_intervalSpan" },
        { type: "uint256", name: "_numberOfMints" }
      ]
    }
  ];
  const iFace = new utils.Interface(
    actionMultiMintForTriggerTimestampPassedABI
  );

  const payloadWithSelector = iFace.functions.action.encode([
    gelatoCore,
    selectedExecutor,
    timeTrigger,
    startTime,
    action,
    actionPayloadWithSelector,
    intervalSpan,
    numberOfMints
  ]);

  return payloadWithSelector;
}
