const mongoose = require('../lib/database')

const User = mongoose.model('User', {
  steamID: String,
  discordID: String,
  roleID: String,
  email: String
})

module.exports = User
