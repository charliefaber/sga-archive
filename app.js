var http = require('http');
var express = require('express');
var fileUpload = require('express-fileupload');
var exphbs = require('express-handlebars');
var textract = require('textract');
var path = require('path');
// var fs = require('fs');
//var jsonQuery = require('json-query');
//var methodOverride = require('method-override');

var port = process.env.PORT || 3000;
//var mongoose = require('mongoose');
//var passport = require('passport');

var mongo = require('mongodb');
var assert = require('assert');
var MongoClient = mongo.MongoClient;
var configDb = require('./config/database.js');
//var auth = require('./config/auth.js');

var session = require('express-session');
var app = express();

var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

app.use(cookieParser());

app.use(bodyParser.urlencoded({ extended: true}));
app.use(bodyParser.json());

app.use(session({ secret: 'keyboard cat',
                  resave: true,
                  saveUninitialized: true,
                }));

var authAdmin = function(req, res, next) {
  if(req.session && req.session.admin)
    return next();
  else
    res.sendFile(path.join(__dirname + '/views/login.html'))
};


var bcrypt = require('bcrypt-nodejs');
// Generate a salt
var salt = bcrypt.genSaltSync(10);

// // Hash the password with the salt
// var hash = bcrypt.hashSync("ChampionOfRrr", salt);

// MongoClient.connect(configDb.url, function(err, db) {
//   assert.equal(null, err) 
  
//   db.collection('users').insert({name: "admin", password: hash});

// });

app.use(fileUpload());
app.use(express.static(__dirname));

var hbs = exphbs.create({
  helpers: {
    defaultLayout: 'main',
    inc: function(num) {return num+1;},
  }
});

app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

//routers
//require('./config/passport.js');
require('./app/routes.js')(app);

app.get('/upload', authAdmin, function(req, res) {
  res.render(path.join(__dirname, "/views/upload.handlebars"),{redirect: false});
});

var listener = http.createServer(app).listen(process.env.PORT||3000);
console.log('Server is listening at port ' + listener.address().port);