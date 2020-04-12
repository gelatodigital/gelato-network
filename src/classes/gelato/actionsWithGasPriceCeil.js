import { constants } from "ethers";

class ActionsWithGasPriceCeil {
  constructor(addresses, gasPriceCeil) {
    if (!addresses)
      throw new Error(
        "\n ActionsWithGasPriceCeil: no address passed to constructor \n "
      );
    this.addresses = addresses;
    this.gasPriceCeil = gasPriceCeil ? gasPriceCeil : constants.HashZero;
  }
}

export default ActionsWithGasPriceCeil;
