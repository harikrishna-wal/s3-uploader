const express = require('express');
const bodyParser = require('body-parser');
const _ = require('lodash');

var {mongoose} = require('./mongoose');
var {Upload} = require('./models/upload');
var formidable = require("formidable");
var fs = require("fs");
var http = require("http");
var internetAvailable = require("internet-available");
const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  accessKeyId: 'AKIAIEEVYQPOU6D3I5BA',
  secretAccessKey: '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'
});
const s3_bucket = 'c3-demo';

var app = express();

app.use(bodyParser.json(), function(req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  if ('OPTIONS' == req.method)
    res.sendStatus(200);
  else
    next();
});

// To get list of all users
// app.get('/users', (request, response) => {
//   User.find().then((users) => {
//     response.send({users});
//   }, (error) => {
//     response.status(400).send(error);
//   })
// });

// // To get user by id
// app.get('/users/:id', (request, response) => {
//   User.findById(request.params.id).then((users) => {
//     response.send({users});
//   }, (error) => {
//     response.status(400).send({'msg': 'User not found', 'error': error});
//   })
// });

var localFileDir = './uploads/';

// Upload a new file to s3
app.post('/upload', (request, response) => {
  var form = new formidable.IncomingForm();
    form.parse(request, function(err, fields, files) {
        if (err) next(err);
        if(!Object.keys(files).length) {
          response.status(422).send({'success': false, 'err': 'Please select a file to upload.'});
        }
        else {
          form.uploadDir = localFileDir;
          fs.rename(files.file.path, form.uploadDir + files.file.name , function(err) {
              if (err) next(err);

              let local_url = 'http://' + request.headers.host + '/download/' + files.file.name;
              let upload = new Upload({
                s3_url: '',
                local_url: local_url,
                file_name: files.file.name,
                file_size: files.file.size,
                file_type: files.file.type,
                action_type: 'NEW_FILE',
                connectivity: 0,
              });

              upload.save().then((dbSaveResp) => {
                internetAvailable().then(function(){
                    fs.readFile(localFileDir + files.file.name, (err, data) => {
                       if (err) throw err;
                       const params = {
                           Bucket: s3_bucket,
                           Key: files.file.name,
                           Body: data,
                           ACL: 'public-read',
                           ContentType: files.file.type
                       };
                       s3.upload(params, function(s3Err, uploadData) {
                           if (s3Err) throw s3Err

                           Upload.findById(dbSaveResp._id, function (err, user) {
                              user.connectivity = 1
                              user.s3_url = data.Location
                              user.save(function (err, dbUpdateResp) {
                                response.send(
                                  {
                                    'data': dbUpdateResp,
                                    'success': true,
                                    'msg': 'File is uploaded to s3 successfully'
                                  }
                                );
                              });
                           });
                       });
                    });
                }).catch(function(){
                    response.send(
                      {
                        'data': dbSaveResp,
                        'success': true,
                        'msg': 'File is uploaded to local disk successfully',
                        'connectivityProb': 'It seems internet connection is not available'
                      }
                    );
                });
              }, (error) => {
                response.status(400).send(error);
              });
          });
        }
    });


});

// Get all files from s3
app.get('/upload', (request, response) => {
  let params = {
    Bucket: s3_bucket
  };
  s3.listObjects(params, function(err, data) {
   if (err) console.log(err, err.stack); // an error occurred
   else     response.send(data);           // successful response
 });
});


// Get list of all file from DB
app.get('/list-files', (request, response) => {
  Upload.find().then((files) => {
    response.send({files});
  }, (error) => {
    response.status(400).send(error);
  })
});


// Download a file
app.get('/download/:file_name', (request, response) => {
  let file_name = request.params.file_name;
  let file_path = "./uploads/"+file_name;
  response.download(file_path);
});

// // Delete user
// app.delete('/users/:id', (request, response) => {
//   let id = request.params.id;
//   if(mongoose.Types.ObjectId.isValid(id)) {
//     User.findByIdAndRemove(id, function(err, deletedResp) {
//       if (err)
//           response.send(err);
//         else {
//           if(deletedResp != null) {
//             response.send({'success': true, 'msg': 'User deleted successfully'});
//           } else {
//             response.send({'success': false, 'msg': 'User not found'});
//           }
//         }
//     });
//   }
// });

// // Update user
// app.put('/users/:id', (request, response) => {
//   User.findById(request.params.id, function (err, user) {
//     if (err) response.send({'success': false, 'msg': err});
//     user.first_name = request.body.first_name;
//     user.last_name = request.body.last_name;
//     user.save(function (err, updatedUser) {
//       if (err) response.send({'success': false, 'msg': err});
//       response.send({'success': true, 'msg': 'User updated successfully', 'data': updatedUser});
//     });
//   });
// });

// // Login
// app.post('/login', (request, response) => {
//   User.findOne({ 'username': request.body.username, 'password': request.body.password }, (error, user) => {
//     if(error) {
//       response.send(error);
//     }

//     if(user != null) {
//       user = JSON.parse(JSON.stringify(user));
//       user = _.omit(user, ['password']);
//       let successMsg = {'success':true, 'payload':user}
//       response.send(successMsg);
//     } else {
//       let errorMsg = {'success':false,'error':'Invalid username or password'};
//       response.status(401).send(errorMsg);
//     }
//   });
// });


app.listen(3000, () => {
  console.log('Server started on port 3000');
});
