const { Router } = require('express')
const router = Router()
const passport = require('passport')
const config = require('../lib/config')
const ensureLoggedIn = require('connect-ensure-login')

router.get('/discord', passport.authenticate('discord',
  { scope: ['identify', 'email', 'guilds', 'guilds.join'] }))
router.get('/discord/callback', passport.authenticate('discord', {
  failureRedirect: '/auth/discord',
  successReturnToOrRedirect: '/'
}), (req, res) => {
  res.redirect(req.session.returnTo || '/')
  delete req.session.returnTo
})

router.get('/steam', passport.authenticate('steam'))
router.get('/steam/callback', passport.authenticate('steam', {
  failureRedirect: '/auth/steam'
}), (req, res) => {
  res.redirect(req.session.returnTo || '/')
  delete req.session.returnTo
})

router.get('/logout', (req, res) => {
  req.logout()
  res.redirect(req.session.returnTo || '/')
  delete req.session.returnTo
})

module.exports = router
