var assert = require('assert');
var MongoClient = require('mongodb').MongoClient;
var configDb = require('../../config/database.js');
var path = require('path');
var express = require('express');
var app = express();
var fs = require('fs');

module.exports = function(app){
    fs.readdirSync(__dirname).forEach(function(file) {
        if (file == "index.js") return;
        var name = file.substr(0, file.indexOf('.'));
        require('./' + name)(app);
    });

    app.get('/', function(req, res) {
        MongoClient.connect(configDb.url, function(err, db) {
        assert.equal(null, err);

            db.collection('documents').find().sort({ date: -1}).limit(5).toArray(function(err, items) {
                if(req.session.admin)
                    res.render(path.join(__dirname, '../../views/indexAdmin.handlebars'), { items: items });
                else
                    res.render(path.join(__dirname, '../../views/index.handlebars'), { items: items });
            });
        });
    });

    app.get('/advanced', function(req, res) {
      var session = req.session.admin;
      if(session)
        res.sendFile(path.join(__dirname, "/../../views/advancedAdmin.html"));
      else
        res.sendFile(path.join(__dirname, "/../../views/advanced.html"));
    });

    app.get('/help', function(req, res) {
      var session = req.session.admin;
      if(session)
        res.sendFile(path.join(__dirname, "/../../views/helpAdmin.html"));
      else
        res.sendFile(path.join(__dirname, "/../../views/help.html"));
    });
}