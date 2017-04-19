const mongoose = require('../lib/database')

const PaymentLog = mongoose.model('PaymentLog', {
  payer_email: String,
  item_name: String,
  ipn_track_id: String,
  receiver_id: String,
  payment_id: String,
  btn_id: String,
  subscription_id: String,
  mc_gross: String,
  payment_date: Date
})

module.exports = PaymentLog
