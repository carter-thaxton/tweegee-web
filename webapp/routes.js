var express = require('express')
var router = express.Router()

var tweegee = require('./tweegee')

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index');
})

router.post('/file_upload', function(req, res, next) {
  tweegee.convertToTwee(req.file, function(err, data) {
    if (err) return next(err)
    res.json(data)
  })
})

module.exports = router;
