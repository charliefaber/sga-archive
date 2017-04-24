//app/routes.js
var assert = require('assert');
var MongoClient = require('mongodb').MongoClient;
var configDb = require('../config/database.js');
var path = require('path');
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var textract = require('textract');
//var auth = require('../config/auth.js');
var bcrypt = require('bcrypt-nodejs');

module.exports = function(app){

app.get('/', function(req, res) {
    MongoClient.connect(configDb.url, function(err, db) {
    assert.equal(null, err);

        db.collection('documents').find().sort({ date: -1}).limit(5).toArray(function(err, items) {
            if(req.session.admin) 
                res.render(path.join(__dirname, '../views/indexAdmin.handlebars'), { items: items });
            else 
                res.render(path.join(__dirname, '../views/index.handlebars'), { items: items });
        });
    });
});

app.get('/advanced', function(req, res) {
  var session = req.session.admin;
  if(session) 
    res.sendFile(path.join(__dirname, "/../views/advancedAdmin.html"));
  else
    res.sendFile(path.join(__dirname, "/../views/advanced.html"));
});

app.get('/download/:file(*)', function(req, res){
  var file = req.params.file;
  var p = path.join(__dirname, "../uploads/", file + ".docx");
  res.download(p);
});

app.get('/login', function(req, res) {
  res.sendFile(path.join(__dirname, "../views/login.html"));
});

app.get('/logout', function(req, res) {
  var user = req.session.user;
  console.log("logging out " + user);
  req.session.destroy();
  res.redirect('/');
});

app.get('/delete/:doc',function(req,res) {
  var doc = req.params.doc;

  MongoClient.connect(configDb.url, function(err, db) {
    assert.equal(null, err);

    db.collection('documents').find({_id: doc}).toArray(function(err, items) {
      db.collection('deleted').insert(items[0]);
    });

    db.collection('documents').remove({_id: doc});

    res.redirect('/');
  });
});

app.get('/help', function(req, res) {
  var session = req.session.admin;
  if(session) 
    res.sendFile(path.join(__dirname, "/../views/helpAdmin.html"));
  else
    res.sendFile(path.join(__dirname, "/../views/help.html"));
});




app.post('/search', function(req, res) {
  var search = req.body.searchText;         
  var filter = req.body.filterSelect;     
  var relevancy = false, recency = false, highest = false, lowest = false;

  if(filter == null || filter == undefined || filter == "" || filter == "relevancy") 
    relevancy = true;
  else if(filter == "recency") 
    recency = true;
  else if(filter == "highest") 
    highest = true;
  else 
    lowest = true;

  var buttonVals = {filter: filter, relevancy: relevancy, recency: recency, highest: highest, lowest: lowest};

  MongoClient.connect(configDb.url, function(err, db) {
    assert.equal(null, err);

    db.collection('documents').find(
      {$text: {$search: search}},
      {score: {$meta: "textScore"}}
      ).sort({ score: {$meta: "textScore"}}).toArray(function(err, items) {

        if(filter == "recency") {
          items.sort(function(a, b) {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
          });
        }
        else if(filter == "highest") {
          items.sort(function(a, b) {
            return b.amount - a.amount;
          });
        }
        else if(filter == "lowest") {
          items.sort(function(a, b) {
            return a.amount - b.amount;
          });
        }
        var fail = false;
        if(items[0] == null) {
          fail = true;
        }

        var session = req.session.admin;
        if(session == true) 
          res.render(path.join(__dirname, '../views/resultsAdmin.handlebars'), {search: search, buttonVals: buttonVals, results: items, fail: fail});
        else 
          res.render(path.join(__dirname, '../views/results.handlebars'), {search: search, buttonVals: buttonVals, results: items, fail: fail});
      });
    db.close();
  });
});

app.post('/advancedSearch', function(req, res) {
  var search = req.body.advText;                        
  var filter = req.body.advFilterSelect;                

  var relevancy = false, recency = false, highest = false, lowest = false;

  if(filter == null || filter == undefined || filter == "" || filter == "relevancy")
     relevancy = true;
  else if(filter == "recency")
    recency = true;
  else if(filter == "highest")
    highest = true;
  else
    lowest = true;

  // Document Type Checkboxes
  var billCheck = "";               // Bill
  var resCheck = "";                // Resolution
  // If value of Checkbox is 'on', box is checked, therefore store "checked" in respective variable
  if(req.body.billCheck == 'on') {billCheck = "checked";}
  if(req.body.resCheck == 'on') {resCheck = "checked";}
  // Year Range
  var yearMin = req.body.yearMin;
  var yearMax = req.body.yearMax;
  // If min or max not provided, assign default year range of 0 to 3000
  if(yearMin == null || yearMin == undefined || yearMin == "")
    yearMin = 0;
  if(yearMax == null || yearMax == undefined || yearMax == "")
    yearMax = 3000;
  // Amount Range
  var amtMin = req.body.amtMin;
  var amtMax = req.body.amtMax;
  // If min or max not provided, assign default amount range of 0 to 100000
  if(amtMin == null || amtMin == undefined || amtMin == "")
    amtMin = 0;
  if(amtMax == null || amtMax == undefined || amtMax == "")
    amtMax = 100000;

  // Store values of buttons in JavaScript object
  var buttonVals = {filter: filter, relevancy: relevancy, recency: recency, highest: highest, lowest: lowest};

// Connect to Mongo database
  MongoClient.connect(configDb.url, function(err, db) {
    assert.equal(null, err);        // Check for errors

    // Query documents collection
    db.collection('documents').find(
      {$text: {$search: search}},             // User's text passed in search variable
      {score: {$meta: "textScore"}}           // Sort documents by score of match
    ).sort({ score: {$meta: "textScore"}}).toArray(function(err, items) { // Convert to array
      // Filter the array based on the advanced form fields
      items = items.filter(function(item) {
        // Get year of current document being filtered
        var year = new Date(item.date).getFullYear();

        // If both bill and resolution are checked
        if(billCheck == "checked" && resCheck == "checked")
          return(year >= yearMin && year <= yearMax && item.amount >= amtMin && item.amount <= amtMax)
        // Else if only bill is checked
        else if(billCheck == "checked")
          return(item.docType == "BILL" && year >= yearMin && year <= yearMax && item.amount >= amtMin && item.amount <= amtMax);
        // Else if only resolution is checked
        else if(resCheck == "checked") 
          return(item.docType == "RESOLUTION" && year >= yearMin && year <= yearMax && item.amount >= amtMin && item.amount <= amtMax);
      });

      // Use value of filter to determine how to sort results
      if(filter == "recency") {
        // Sort based on recency of date
        items.sort(function(a, b) {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
      }
      else if(filter == "highest") {
        // Sort based on amount of document, highest first
        items.sort(function(a, b) {
          return b.amount - a.amount;
        });
      }
      else if(filter == "lowest") {
        // Sort based on amount of document, lowest first
        items.sort(function(a, b) {
          return a.amount - b.amount;
        });
      }

      var fail = false;
      if(items[0] == null) {
        fail = true;
      }

      var session = req.session.admin;
      if(session == true) 
        res.render(path.join(__dirname, '../views/resultsAdmin.handlebars'), {search: search, buttonVals: buttonVals, results: items, fail: fail});
      else 
        res.render(path.join(__dirname, '../views/results.handlebars'), {search: search, buttonVals: buttonVals, results: items, fail: fail}); 
    });
    db.close();
  });
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
    });
  });
});

app.post('/upload', function(req, res) {
  if (!req.files)
    return res.status(400).send('No files were uploaded.');

  var myFile = req.files.myFile;
  var idText = req.body.idText;
  idText = idText.trim();
  var doctypeSelect = req.body.doctypeSelect;
  var dollarText = req.body.dollarText;
  var dateSelect = req.body.dateSelect;
  var tagText = req.body.tagText;
  var bodyText = "";

  
  var filePath = path.join(__dirname,`../uploads/${idText}.docx`);
  myFile.mv(filePath, function(err) {
    if (err)
      return res.status(500).send(err);

    textract.fromFileWithPath(filePath, function( error, text ) {
      bodyText = text;
    });
  });
  
  var upload = {idText: idText, doctypeSelect: doctypeSelect, dollarText: dollarText, dateSelect: dateSelect, tagText:tagText, bodyText:bodyText};

  MongoClient.connect(configDb.url, function(err, db) {
    assert.equal(null, err);
    db.collection('documents').find({_id: idText}).toArray(function(err, item) {
      if(item[0] == null) {
        db.collection('documents').find().sort({ date: -1}).limit(5).toArray(function(err, items) {
          res.render(path.join(__dirname, '../views/upload.handlebars'), { redirect: true, upload: upload, success: true });
        });
      } 
      else {
        db.collection('documents').find().sort({ date: -1}).limit(5).toArray(function(err, items) {
          res.render(path.join(__dirname, '../views/upload.handlebars'), {redirect: true, upload: upload, success: false });
        });
      }
    });
    
    db.collection('documents').insertOne( {
      "_id": idText,
      "path": filePath,
      "docType": doctypeSelect,
      "amount": dollarText,
      "date": dateSelect,
      "tagline": tagText,
      "text": bodyText});

    db.close();
  });
});
};
