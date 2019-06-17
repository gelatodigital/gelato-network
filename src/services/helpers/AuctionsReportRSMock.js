const loggerNamespace = 'dx-service:services:helpers:AuctionsReportRS'
const Logger = require('../../helpers/Logger')
const logger = new Logger(loggerNamespace)

const { Readable } = require('stream')

const TEST_FILE = `Auction index;Sell token;Buy token;Sell volume;Buy volume;Last closing price;Price increment;Bot sell volume;Bot buy volume;Ensured sell volume;Ensured buy volume\
1;WETH;RDN;0,9;0,9;300;N/A;0.9;0.9;100,00%;100,00%
1;RDN;WETH;0;0;0,003333333;N/A;0;0;0,00%;0,00%
2;WETH;RDN;1,4;1,4;330;10,00%;0,85;0,95;60,71%;0,63%
2;RDN;WETH;150;150;0,003030303;-10,00%;120;33;80,00%;22,00%`

class AuctionsReportRS extends Readable {
  constructor () {
    super()
    this._lines = TEST_FILE.split('\n')
    this._index = 0
    this._numLines = this._lines.length
  }

  _read (size) {
    setTimeout(() => {
      if (this._index >= this._numLines) {
        logger.debug('The file has been generated')
        this.push(null)
        return
      }

      const line = this._lines[this._index]
      this._index = this._index + 1

      try {
        logger.debug('Pushing line: ' + line)
        this.push(line + '\n', 'UTF-8')
      } catch (error) {
        logger.error({
          msg: 'Error generating AuctionsReport: ' + error.message,
          error
        })
        this.emit('error', error)
      }
    }, this._index * 500)
  }
}

module.exports = AuctionsReportRS
