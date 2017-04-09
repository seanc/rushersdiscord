const { Router } = require('express')
const router = Router()
const auth = require('../middleware/auth')

router.use(auth)

router.get('/', (req, res) => {
  console.log(req.user)
  res.render('account', { user: req.user })
})

module.exports = router
