const mongoose = require('../lib/database')

const Subscription = mongoose.model('Subscription', {
  subscription_id: String,
  item_number: String,
  subscription_date: Date,
  user_id: String,
  discordID: String,
  active: Boolean,
  suspended: { type: Boolean, default: false },
  managed: { type: Boolean, default: false }
})

module.exports = Subscription
