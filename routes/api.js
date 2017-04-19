const { Router } = require('express')
const router = new Router()
const { getOnline } = require('../bot/bot.js')

router.get('/online', (req, res) => {
  getOnline().then(online => {
    res.send({ online })
  })
})

module.exports = router
