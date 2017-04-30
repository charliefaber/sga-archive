var MongoClient = require('mongodb').MongoClient;
var configDb = require('../../config/database.js');
var path = require('path');
var express = require('express');
var app = express();
var assert = require('assert');
var bodyParser = require('body-parser');


module.exports = function(app){

    app.get('/download/:file(*)', function(req, res){
      var file = req.params.file;
      MongoClient.connect(configDb.url, function(err, db) {
        assert.equal(null, err);

        db.collection('documents').find({_id:file}).toArray(function(err, items) {
          // var p = path.join(__dirname, "../uploads/", items[0].path);
          res.download(items[0].path);
        });
        db.close();
      });

    });

    app.post('/search', function(req, res) {
      var search = req.body.searchText;
      var filter = req.body.filterSelect;
      var relevancy = false, recency = false, highest = false, lowest = false;

      if(filter == null || filter == undefined || filter == "" || filter == "relevancy")
        relevancy = true;
      else if(filter == "recency")
        recency = true;
      else if(filter == "cost (highest first)")
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
            else if(filter == "cost (highest first)") {
              items.sort(function(a, b) {
                return b.amount - a.amount;
              });
            }
            else if(filter == "cost (lowest first)") {
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
      else if(filter == "cost (highest first)")
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
          else if(filter == "cost (highest first)") {
            // Sort based on amount of document, highest first
            items.sort(function(a, b) {
              return b.amount - a.amount;
            });
          }
          else if(filter == "cost (lowest first)") {
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

}