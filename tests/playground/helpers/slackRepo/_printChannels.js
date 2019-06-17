function _printChannel ({
  id,
  name,
  is_private: isPrivate,
  topic,
  purpose,
  num_members: numMembers
}, index) {
  const publicOrPrivate = isPrivate ? 'Private' : 'Public'
  console.log(`\n\t [${index + 1}] ${name} (${id}), ${publicOrPrivate}`)
  if (topic.value) {
    console.log(`\t\t- Topic: ${topic.value}`)
  }
  if (purpose.value) {
    console.log(`\t\t- Purpose: ${purpose.value}`)
  } 
  console.log(`\t\t- Members in the channel: ${numMembers}`)
}

function _printChannels (channels) {
  if (channels.length > 0) {
    console.log(`${channels.length} channels: `)
    channels.forEach(_printChannel)
  } else {
    console.log('No channels')
  }
}

module.exports = _printChannels
