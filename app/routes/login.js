var express = require('express');
var MongoClient = require('mongodb').MongoClient;
var configDb = require('../../config/database.js');
var app = express();
var bodyParser = require('body-parser');
var bcrypt = require('bcrypt-nodejs');
var path = require('path');

module.exports = function(app){

    app.get('/login', function(req, res) {
        res.sendFile(path.join(__dirname, "../../views/login.html"));
    });

    app.get('/logout', function(req, res) {
        var user = req.session.user;
        console.log("logging out " + user);
        req.session.destroy();
        res.redirect('/');
    });

    app.post('/checkLogin', function(req, res) {
      var username = req.body.username;
      var password = req.body.password;

      MongoClient.connect(configDb.url, function(err, db) {
        db.collection('users').find({name: username}).toArray(function(err, items) {
          if(items[0] == undefined) {
            res.redirect('/login');
          }
          else if(bcrypt.compareSync(password, items[0].password)) {
            req.session.admin = true;
            req.session.user = username;
            res.redirect('/upload');
          }
          else {
            res.redirect('/login');
          }
        });
      });
    });

}