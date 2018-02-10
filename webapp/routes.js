var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.post('/file_upload', function(req, res, next) {
  res.json({ok: true, file: req.file});
});

module.exports = router;
