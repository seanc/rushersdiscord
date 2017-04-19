const { Router } = require('express')
const router = new Router()
const passport = require('passport')
const ensureLoggedIn = require('connect-ensure-login')
const User = require('../models/user')
const Subscription = require('../models/subscription')
const PaymentLog = require('../models/payment_log')
const map = require('async.map')
const config = require('../lib/config')
const mongoose = require('../lib/database')
const formatter = require('currency-formatter')

const MONTH_MS = 2629746000
const WEEK_MS = 604800000
const DAY_MS = 86400000

router.use(ensureLoggedIn.ensureLoggedIn('/auth/steam'))
router.use((req, res, next) => {
  if (!config.admins.includes(req.user.steamID)) {
    return res.redirect('/')
  }
  next()
})
router.use((req, res, next) => {
  PaymentLog.find({}, (err, logs) => {
    const profits = logs.reduce((acc, curr) => {
      const gross = parseInt(curr.mc_gross)
      acc.total += gross

      if (new Date(curr.payment_date) > new Date(Date.now() - MONTH_MS)) {
        acc.month += gross
      }

      if (new Date(curr.payment_date) > new Date(Date.now() - WEEK_MS)) {
        acc.week += gross
      }

      if (new Date(curr.payment_date) > new Date(Date.now() - DAY_MS)) {
        acc.day += gross
      }

      return acc
    }, { month: 0, week: 0, day: 0, total: 0 })

    Object.keys(profits).forEach(key => {
      profits[key] = formatter.format(profits[key], { code: 'USD' })
    })

    req.profits = profits
    next()
  })
})

router.get('/', (req, res) => res.redirect('/admin/users'))

// TODO: admin router
router.get('/users', (req, res) => {
  User.find({}, (err, users) => {
    map(users, (user, cb) => {
      Subscription.find({ user_id: user.id }, (err, subs) => {
        const active = subs.some(sub => sub.active)
        user.active = active
        cb(err, user)
      })
    }, (err, users) => {
      users = users.filter(u => u.active)
      res.render('admin/users', { users, profits: req.profits })
    })
  })

})

router.get('/subscriptions', (req, res) => {
  Subscription.find({}, (err, subscriptions) => {
    map(subscriptions, (sub, cb) => {
      User.findOne({ _id: sub.user_id }, (err, user) => {
        sub.user = user
        cb(err, sub)
      })
    }, (err, subscriptions) => {
      res.render('admin/subscriptions', { subscriptions, profits: req.profits })
    })
  })
})

module.exports = router
