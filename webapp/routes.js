var express = require('express')
var router = express.Router()

var tweegee = require('./tweegee')

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index');
})

router.post('/tweegee', function(req, res, next) {
  tweegee(req.file, req.params, function(err, data) {
    if (err) {
      data = data || {}
      data.ok = false
      data.error = err.message
      res.status(400)
    }

    // Don't send these back to the client
    delete data.inputFile
    delete data.tweeFile

    // Send json response no matter what happens as result of calling tweegee
    res.json(data)
  })
})

module.exports = router;
