var express = require('express');
var router = express.Router();
const config = require('../lib/config')
const plans = Object.keys(config.plans).slice(0, 3).map(p => {
  return config.plans[p]
})
const CryptoJS = require('crypto-js')
const bot = require('../bot/bot.js')

const cache = {}
bot.getOnline().then(online => cache.online = online)

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { plans, online: cache.online });
});

router.get('/faq', (req, res, next) => {
  res.render('faq')
})

router.get('/subscribe/:plan', (req, res, next) => {
  const name = req.param('plan')
  const plan = plans.find(p => p.name === name)
  const user = req.user

  req.session.returnTo = req.path

  if (!plan) {
    res.status(404)
    return next()
  }

  const paypalUser = user ? CryptoJS.AES.encrypt(JSON.stringify({
    discordID: user.discordID,
    email: user.email,
    id: user._id
  }), config.billing.cipherSecret) : ''

  res.render('subscribe', {
    plan, user, isSandbox: config.billing.sandbox,
    paypalUser
  })
})

router.get('/payment-success', (req, res) => {
  res.render('success')
})

module.exports = router;
