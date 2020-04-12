import { constants } from "ethers";

class ActionWithGasPriceCeil {
  constructor(address, gasPriceCeil) {
    if (!address)
      throw new Error(
        "\n ActionWithGasPriceCeil: no address passed to constructor \n "
      );
    this.addresses = [address, address];
    this.gasPriceCeil = gasPriceCeil ? gasPriceCeil : constants.HashZero;
  }
}

export default ActionWithGasPriceCeil;
