const { Readable } = require('stream')

const TEST_FILE = `Auction index;Sell token;Buy token;Sell volume;Buy volume;Last closing price;Price increment;Bot sell volume;Bot buy volume;Ensured sell volume;Ensured buy volume\
1;ETH;RDN;0,9;0,9;300;N/A;0.9;0.9;100,00%;100,00%
1;RDN;ETH;0;0;0,003333333;N/A;0;0;0,00%;0,00%
2;ETH;RDN;1,4;1,4;330;10,00%;0,85;0,95;60,71%;0,63%
2;RDN;ETH;150;150;0,003030303;-10,00%;120;33;80,00%;22,00%`

const lines = TEST_FILE.split('\n')
let index = 0
let numLines = lines.length

// Create RS
const fileReadbleStream = new Readable({
  read (size) {
    setTimeout(() => {
      if (index >= numLines) {
        fileReadbleStream.push(null)
        return
      }

      const line = lines[index]
      index++

      try {
        fileReadbleStream.push(line + '\n', 'UTF-8')
      } catch (error) {
        fileReadbleStream.emit('error', error)
        throw error
      }
    }, index * 1500)
    lines.forEach((line, index) => {
    })
  }
})

// Pipe it
fileReadbleStream.pipe(process.stdout)
