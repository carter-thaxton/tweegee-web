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
      res.json({ok: false, error: err.message})
    } else {
      res.json(data)
    }
  })
})

module.exports = router;
