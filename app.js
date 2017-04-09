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

var index = require('./routes/index');
var users = require('./routes/users');
var auth = require('./routes/auth')
var account = require('./routes/account')

var app = express();

passport.serializeUser((user, done) => {
  console.log(user, 'serialize')
  done(null, user.id)
})

passport.deserializeUser((id, done) => {
  console.log(id, 'deserailize')
  User.findOne({ discordID: id }, (err, user) => {
    done(err, user)
  })
})

const { discord } = config
passport.use(new DiscordStrategy({
  clientID: discord.id,
  clientSecret: discord.secret,
  callbackURL: discord.callback,
  scope: ['identify', 'email', 'guilds', 'guilds.join']
}, (accessToken, refreshToken, profile, cb) => {
  console.log(accessToken, refreshToken, profile)
  User.findOneOrCreate({ discordID: profile.id }, {
    email: profile.email,
    discordID: profile.id
  }, (err, user) => {
    return cb(err, user)
  })
}))

// TODO: steam strategy

nunjucks.configure('views', {
  autoescape: true,
  express: app
})
// view engine setup
// app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'nunjucks');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
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
  cookie: { secure: false }
}))
app.use(passport.initialize())
app.use(passport.session())

app.use('/', index);
app.use('/users', users);
app.use('/auth', auth)
app.use('/account', account)

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
