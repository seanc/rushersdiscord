var express = require('express');
var router = express.Router();
const config = require('../lib/config')
const plans = Object.keys(config.plans).slice(0, 3).map(p => {
  return config.plans[p]
})

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { plans });
});

router.get('/faq', (req, res, next) => {
  res.render('faq')
})

router.get('/subscribe/:plan', (req, res, next) => {
  const name = req.query('plan')
  const plan = plans.find(p => p.name === name)

  if (!plan) {
    res.status(404)
    return next()
  }

  res.render('subscribe', { plan })
})

module.exports = router;
