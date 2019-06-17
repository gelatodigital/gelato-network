(function () {
  var versionContainer = document.getElementById('versionContainer')
  var xhr = new XMLHttpRequest()
  xhr.open('GET', 'version')
  xhr.onload = function () {
    if (xhr.status === 200) {
      versionContainer.innerHTML = '&nbsp;- &nbsp;v' + JSON.parse(xhr.responseText)
    } else {
      console.error('ERROR getting the version: ' + xhr.status)
    }
  }
  xhr.send()
})()
