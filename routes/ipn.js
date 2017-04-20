const { Router } = require('express')
const router = new Router()
const ipn = require('paypal-ipn')
const config = require('../lib/config')
const Subscription = require('../models/subscription')
const PaymentLog = require('../models/payment_log')
const logger = require('catlog')('app:ipn ')
const CryptoJS = require('crypto-js')
const plans = Object.keys(config.plans).slice(0, 3).map(p => {
  return config.plans[p]
})
const superagent = require('superagent')

router.post('/', (req, res) => {
  ipn.verify(req.body, { allow_sandbox: config.billing.sandbox }, (err, message) => {
    res.status(200).send()

    if (err) {
      return console.log(err)
    }

    const body = req.body

    const plan = plans.find(p => p.itemNumber === body.item_number)
    if (!plan) {
      logger.error(`No plan ${body.item_number} found for subscription ${body.subscr_id}`)
    }

    // cancel existing subscription if paying for a new one
    if (body.txn_type === 'subscr_signup' || body.txn_type === 'subscr_payment' && body.custom) {
      const bytes = CryptoJS.AES.decrypt(body.custom, config.billing.cipherSecret)
      const user = JSON.parse(bytes.toString(CryptoJS.enc.Utf8))

      Subscription.find({ $and: [{ user_id: user.id }, { active: true }, { suspended: false }] }, (err, subs) => {
        if (err) return console.log(err)

        subs.forEach(sub => {
          if (!sub) return logger.error(`Could not find subscription matching id ${body.subscr_id} (while canceling via api)`)
          if (sub.subscription_id === body.subscr_id) return logger.error(`Attempted to cancel pending subscription`)

          superagent.post(`https://api-3t${config.billing.sandbox ? '.sandbox' : ''}.paypal.com/nvp`)
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send({ METHOD: 'ManageRecurringPaymentsProfileStatus' })
          .send({ VERSION: '204.0' })
          .send({ USER: config.billing.api.username })
          .send({ PWD: config.billing.api.password })
          .send({ SIGNATURE: config.billing.api.signature })
          .send({ PROFILEID: sub.subscription_id })
          .send({ ACTION: 'Cancel' })
          .send({ NOTE: 'Subscribed to a different plan' })
          .end((err, res) => {
            if (err) return console.log(err)

            if (res.text.includes('PROFILEID')) {
              logger.log(`Subscription ${sub.subscription_id} canceled via paypal api`)
            } else {
              const error = res.text.match('L_LONGMESSAGE0=(*.)&')[0]
              logger.log(`An error occurred while canceling subscription ${sub.subscription_id}: ${decodeURI(error)}`)
            }
          })
        })
      })
    }

    if (body.txn_type === 'subscr_signup' && body.custom) {
      const bytes = CryptoJS.AES.decrypt(body.custom, config.billing.cipherSecret)
      const user = JSON.parse(bytes.toString(CryptoJS.enc.Utf8))

      Subscription.findOneOrCreate({ subscription_id: body.subscr_id }, {
        subscription_id: body.subscr_id,
        item_number: body.item_number,
        subscription_date: body.payment_date,
        active: false,
        user_id: user.id,
        discordID: user.discordID
      }, (err, sub) => {
        if (err) return logger.error(err)

        logger.log(`Subscription ${sub.subscription_id} successfully registered`)
      })
    }

    if (body.txn_type === 'subscr_payment' && body.payment_status && body.custom) {
      if (body.payment_status === 'Completed') {
        const bytes = CryptoJS.AES.decrypt(body.custom, config.billing.cipherSecret)
        const user = JSON.parse(bytes.toString(CryptoJS.enc.Utf8))

        Subscription.findOneOrCreate({ subscription_id: body.subscr_id }, {
          subscription_id: body.subscr_id,
          item_number: body.item_number,
          subscription_date: body.payment_date,
          active: true,
          user_id: user.id,
          discordID: user.discordID,
        }, (err, sub) => {
          if (err) return console.error(err)

          if (sub.item_number === body.item_number && plan.price == body.mc_gross) {
            sub.active = true
            sub.save((err, _) => {
              if (err) {
                logger.error(`An error occurred while updating and saving subscription ${body.subscr_id}`)
                return console.log(err)
              }

              const paymentLog = new PaymentLog()
              paymentLog.payer_email = body.payment_email
              paymentLog.item_name = body.item_name
              paymentLog.ipn_track_id = body.ipn_track_id
              paymentLog.btn_id = body.btn_id
              paymentLog.subscription_id = body.subscr_id
              paymentLog.mc_gross = body.mc_gross
              paymentLog.payment_date = body.payment_date
              paymentLog.save((err, log) => {
                if (err) {
                  logger.error(`An error occurred while saving payment log for subscription ${body.subscr_id}`)
                  return logger.error(err)
                }

                logger.log(`Payment log for subscription ${body.subscr_id} created on ${new Date(log.payment_date).toUTCString()}`)
              })

              logger.log(`Status for subscription ${sub.subscription_id} updated to "activated"`)
            })
          } else {
            logger.error(`Item number and price do not match for subscription payment ${sub.subscription_id}`)
          }
        })
      } else {
        logger.error(`Payment status is not "completed" for subscription ${body.subscr_id}`)
      }
    }

    if (body.txn_type === 'subscr_eot' || body.txn_type === 'subscr_cancel' || body.txn_type === 'subscr_refunded' || body.txn_type === 'subscr_suspended' && body.custom) {
      const bytes = CryptoJS.AES.decrypt(body.custom, config.billing.cipherSecret)
      const user = JSON.parse(bytes.toString(CryptoJS.enc.Utf8))

      Subscription.findOne({ subscription_id: body.subscr_id }, (err, sub) => {
        if (err) return console.log(err)

        if (!sub) {
          return logger.error(`Subscription ${body.subscr_id} not found (while canceling)`)
        }

        sub.active = false
        sub.suspended = true

        sub.save((err, _) => {
          if (err) {
            logger.error(`An error occurred while updating and saving subscription ${body.subscr_id}`)
            return logger.error(err)
          }

          logger.log(`Subscription ${body.subscr_id} canceled on ${new Date().toUTCString()}`)
        })
      })
    }
  })
})

module.exports = router
