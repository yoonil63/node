var express = require('express');
var router = express.Router();
var users = require('./users_controller');

//users.signup

/* GET users listing. */
router.get('/', function(req, res, next) {
    res.render('signup');
});

module.exports = router;
