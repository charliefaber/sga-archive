var path = require('path');
var assert = require('assert');
var MongoClient = require('mongodb').MongoClient;
var configDb = require('../../config/database.js');
var express = require('express');
var bodyParser = require('body-parser');
var textract = require('textract');


module.exports = function(app){

app.post('/upload', function(req, res) {
  if (!req.files)
    return res.status(400).send('No files were uploaded.');

  var myFile = req.files.myFile;
  var filename = myFile.name;
  var ext = filename.split('.').pop();
  var idText = req.body.idText;
  idText = idText.trim();
  var doctypeSelect = req.body.doctypeSelect;
  var dollarText = req.body.dollarText;
  var dateSelect = req.body.dateSelect;
  var tagText = req.body.tagText;
  var bodyText = "";

  console.log(myFile);
  console.log(ext);
  var filePath = path.join(__dirname,`../uploads/${filename}`);
  myFile.mv(filePath, function(err) {
    if (err)
      return res.status(500).send(err);

    textract.fromFileWithPath(filePath, function( error, text ) {
      bodyText = text;
    });
  });

  var upload = {idText: idText, filename: filename, doctypeSelect: doctypeSelect, dollarText: dollarText, dateSelect: dateSelect, tagText:tagText, bodyText:bodyText};

  MongoClient.connect(configDb.url, function(err, db) {
    assert.equal(null, err);
    db.collection('documents').find({_id: idText}).toArray(function(err, item) {
      if(item[0] == null) {
        db.collection('documents').find().sort({ date: -1}).limit(5).toArray(function(err, items) {
          res.render(path.join(__dirname, '../../views/upload.handlebars'), { redirect: true, upload: upload, success: true });
        });
      }
      else {
        db.collection('documents').find().sort({ date: -1}).limit(5).toArray(function(err, items) {
          res.render(path.join(__dirname, '../../views/upload.handlebars'), {redirect: true, upload: upload, success: false });
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
}