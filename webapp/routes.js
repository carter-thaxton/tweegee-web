var express = require('express')
var router = express.Router()

var tweegee = require('./tweegee')

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index');
})

router.post('/file_upload', function(req, res, next) {
  tweegee(req.file, function(err, data) {
    if (err) {
      data = data || {}
      data.ok = false
      data.error = err.message
      res.status(400)
    }
    // send json response no matter what happens as result of calling tweegee
    res.json(data)
  })
})

module.exports = router;
