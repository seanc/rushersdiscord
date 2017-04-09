const { Router } = require('express')
const router = Router()
const passport = require('passport')
const config = require('../lib/config')

router.get('/discord', passport.authenticate('discord', { scope: ['identify', 'email', 'guilds'] }))
router.get('/discord/callback', passport.authenticate('discord', {
  failureRedirect: '/auth/discord',
  successRedirect: '/account'
}))

module.exports = router
