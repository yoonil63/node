var express = require('express');
var router = express.Router();
var pg = require('pg');
var path = require('path');
var hash = require('./pass').hash;
var passport = require('passport');
var session = require('express-session'),
pgSession = require('connect-pg-simple')(session);
/*
router.use(session({
  resave: false, // don't save session if unmodified
  saveUninitialized: false, // don't create session until something stored
  secret: 'shhhh, very secret'
}));
*/
console.log('aaa');
var connectionString = require(path.join(__dirname, '../', 'config'));
console.log('bbb');

router.use(session({
    store: new pgSession({
    pg : pg,                                  // Use global pg-module 
    conString : connectionString, // Connect db lopreter as user admin
    tableName : 'session'               // Use another table-name than the default "session" one 
  }),
  //secret: process.env.FOO_COOKIE_SECRET,
  secret: 'secret',
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 },// 30 days 
  resave:false,
  saveUninitialized:false
}));

// Session-persisted message middleware

router.use(function(req, res, next){
  var err = req.session.error;
  var msg = req.session.success;
  delete req.session.error;
  delete req.session.success;
  res.locals.message = '';
  if (err) res.locals.message = '<p class="msg error">' + err + '</p>';
  if (msg) res.locals.message = '<p class="msg success">' + msg + '</p>';
  next();
});


var users = {
  tj: { name: 'tj' }
};

console.log('userssss ' + users.tj.name);
// when you create a user, generate a salt
// and hash the password ('foobar' is the pass here)

hash('foobar', function(err, salt, hash)
{
  if (err)
  {
    throw err;
  }
  // store the salt & hash in the "db"
  users.tj.salt = salt;
  users.tj.hash = hash;
});


// Authenticate using our plain-object database of doom!

function authenticate(name, pass, fn) {
  if (!module.parent) 
  {
    console.log('authenticating %s:%s', name, pass);
  }
  var user = users[name];
  // query the db for the given username
  // if the user is not exist
  if (!user) 
  {
    return fn(new Error('cannot find user'));  
  }

  // apply the same algorithm to the POSTed password, applying
  // the hash against the pass / salt, if there is a match we
  // found the user
  hash(pass, user.salt, function(err, hash)
  {
    if (err)
    {
      return fn(err);
    }
    if (hash == user.hash) 
    {
      return fn(null, user);
    }
    fn(new Error('invalid password'));
  });
}

function restrict(req, res, next) {
  if (req.session.user) 
  {
    next();
  } 
  else 
  {
    req.session.error = 'Access denied!';
    res.redirect('/login');
  }
}


router.get('/', function(req, res){
  res.render('login');
});


router.get('/restricted', restrict, function(req, res){
  res.send('Wahoo! restricted area, click to <a href="/login/logout">logout</a>');
});

router.get('/logout', function(req, res){
  // destroy the user's session to log them out
  // will be re-created next request
  req.session.destroy(function(){
    res.redirect('/login');
  });
});

//// SQL Query > Select Data
//        var query = client.query("SELECT * FROM Users where username = " + req.body.username +);
router.post('/', function(req, res){
  authenticate(req.body.username, req.body.password, function(err, user){
    
   /* pg.connect(connectionString, function(err, client, done) {
        // Handle connection errors
        if(err) 
        {
          done();
          console.log(err);
          return res.status(500).json({ success: false, data: err});
        }    
        var query = client.query("SELECT * FROM Users where username = " + req.body.username );
    });
    */
    if (user) {
       
      // Regenerate session when signing in
      // to prevent fixation
      req.session.regenerate(function(){
        // Store the user's primary key
        // in the session store to be retrieved,
        // or in this case the entire user object
        req.session.user = user;
        req.session.success = 'Authenticated as ' + user.name
          + ' click to <a href="/login/logout">logout</a>. '
          + ' You may now access <a href="/login/restricted">/restricted</a>.';
        res.redirect('back');
      });
    } else {
      req.session.error = 'Authentication failed, please check your '
        + ' username and password.'
        + ' (use "tj" and "foobar")';
      res.redirect('/login');
    }
  });
});

module.exports = router;