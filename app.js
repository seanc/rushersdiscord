require('toml-require').install()

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var sassMiddleware = require('node-sass-middleware');
var nunjucks = require('nunjucks')
var session = require('express-session')
var config = require('./lib/config')
var passport = require('passport')
var User = require('./models/user')
var DiscordStrategy = require('passport-discord').Strategy
var SteamStrategy = require('passport-steam').Strategy
var csrf = require('csurf')
var superagent = require('superagent')
var catlog = require('catlog')('app:main ')
var helmet = require('helmet')

var index = require('./routes/index');
var auth = require('./routes/auth')
var ipn = require('./routes/ipn')
var api = require('./routes/api')
var admin = require('./routes/admin')

var app = express();

passport.serializeUser((user, done) => {
  done(null, user)
})

passport.deserializeUser((user, done) => {
  User.findOne({ _id: user._id }, (err, user) => {
    done(err, user)
  })
})

const { discord, steam } = config
passport.use(new DiscordStrategy({
  clientID: discord.id,
  clientSecret: discord.secret,
  callbackURL: discord.callback,
  scope: ['identify', 'email', 'guilds', 'guilds.join']
}, (accessToken, refreshToken, profile, cb) => {
  if (!profile.guilds.find(g => g.id === config.bot.guild)) {
    superagent.post(`https://discordapp.com/api/invites/${config.bot.inviteCode}`)
    .set('Authorization', `Bearer ${accessToken}`)
    .end((err, res) => {
      if (err) return catlog.error('An error occurred while attempting to join server')
      catlog.log(`Successfully added user ${profile.username}#${profile.discriminator} to ${res.body.guild.name}`)
    })
  }
  User.findOneOrCreate({ discordID: profile.id }, {
    email: profile.email,
    discordID: profile.id
  }, (err, user) => {
    return cb(err, user)
  })
}))

passport.use(new SteamStrategy({
  returnURL: steam.callback,
  realm: steam.realm,
  apiKey: steam.apiKey,
  passReqToCallback: true
}, (req, id, profile, done) => {
  if (!req.user) {
    User.findOne({ steamID: profile.id }, (err, user) => {
      if (err) return done(err)
      if (user) return done(null, user)

      const newUser = new User()

      newUser.steamID = profile.id

      newUser.save(err => {
        if (err) return console.log(err)

        return done(null, newUser)
      })
    })
  } else {
    User.findOne({ discordID: req.user.discordID }, (err, user) => {
      if (err) return console.log(err)
      user.steamID = profile.id

      user.save(err => {
        if (err) return console.log(err)

        done(null, user)
      })
    })

  }
}))

nunjucks.configure('views', {
  autoescape: true,
  express: app
})
// view engine setup
// app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'nunjucks');
app.set('trust proxy', 1)

app.disable('x-powered-by')

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev', { skip: (req, res) => req.path === '/online' }));
app.use(helmet())
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(sassMiddleware({
  src: path.join(__dirname, 'public'),
  dest: path.join(__dirname, 'public'),
  indentedSyntax: false, // true = .sass and false = .scss
  sourceMap: true
}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: config.session.secret,
  resave: false,
  saveUninitialized: false,
  name: 'rushersdiscord',
  cookie: { secure: true },
}))
app.use(passport.initialize())
app.use(passport.session())

// non csrf-protected routes
app.use('/ipn', ipn)
app.use('/api', api)

app.use(csrf({ cookie: true }))

app.use('/', index);
app.use('/auth', auth)
app.use('/admin', admin)

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  // res.locals.message = err.message;
  // res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  console.log(err)
  res.status(err.status || 500);
  res.render('error', { message: err.message });
});

module.exports = app;
