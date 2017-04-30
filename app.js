// ------------- SERVER SIDE -------------

// instantiate variables
var http = require('http');
var express = require('express');
var fileUpload = require('express-fileupload');
var exphbs = require('express-handlebars');
var textract = require('textract');
var path = require('path');
// MongoDB setup
var mongo = require('mongodb');
var assert = require('assert');
var MongoClient = mongo.MongoClient;
var configDb = require('./config/database.js');

var session = require('express-session');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var bcrypt = require('bcrypt-nodejs');
var salt = bcrypt.genSaltSync(10);

var app = express();

app.use(cookieParser());

app.use(bodyParser.urlencoded({ extended: true}));
app.use(bodyParser.json());

app.use(session({ secret: 'keyboard cat',
                  resave: true,
                  saveUninitialized: true,
                  cookie: {maxAge: 1800000}
                }));

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

require('./app/routes')(app);

//routers
//require('./config/passport.js');

// // Hash the password with the salt
// var hash = bcrypt.hashSync("ChampionOf3Rs", salt);

// MongoClient.connect(configDb.url, function(err, db) {
//   assert.equal(null, err) 
  
//   db.collection('users').insert({name: "admin", password: hash});

// });

var authAdmin = function(req, res, next) {
  if(req.session && req.session.admin)
    return next();
  else
    res.sendFile(path.join(__dirname + '/views/login.html'))
};

app.get('/upload', authAdmin, function(req, res) {
  res.render(path.join(__dirname, "/views/upload.handlebars"),{redirect: false});
});

var listener = http.createServer(app).listen(process.env.PORT||3000);
console.log('Server is listening at port ' + listener.address().port);