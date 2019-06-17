(function () {
  var networkContainer = document.getElementById('networkContainer')
  var contractsVersionContainer = document.getElementById('contractsVersionContainer')
  var xhr = new XMLHttpRequest()
  xhr.open('GET', '/api/about')
  xhr.onload = function () {
    if (xhr.status === 200) {
      var response = JSON.parse(xhr.response)
      var network
      console.log(response)
      switch (response.ethereum.network) {
        case '1':
          network = 'Mainnet'
          break
        case '4':
          network = 'Rinkeby'
      }

      if (network) {
        networkContainer.innerHTML = '&nbsp;-&nbsp;' + network
      }
      contractsVersionContainer.innerHTML = 'Dx Contract v' + response.contractVersions.dxContracts
    } else {
      console.error('ERROR getting the version: ' + xhr.status)
    }
  }
  xhr.send()
})()
