var mongoose = require('mongoose');


var Upload = mongoose.model('Upload', {
  s3_url: {
    type: String,
    trim: true,
  },
  local_url: {
    type: String,
    trim: true,
  },
  file_name: {
    type: String,
    trim: true,
  },
  file_size: {
    type: Number,
    trim: true,
  },
  file_type: {
    type: String,
    trim: true,
  },
  connectivity: {
    type: Boolean
  },
  uploaded_on: {
    type: Date,
    default: Date.now
  },
  action_type: {
    type: String,
    trim: true
  }
});


module.exports = {Upload};
