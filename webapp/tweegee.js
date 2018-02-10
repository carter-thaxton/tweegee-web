
var path = require('path')
var exec = require('child_process').exec

var binDir = path.join(__dirname, '../bin')

function convertToTwee(file, cb) {
  var inputFile = file.path
  var originalName = file.originalname
  var tweeFile = inputFile + '.tw2'
  var ext = path.extname(originalName)

  var command = null
  switch (ext) {
    case '.tws':
      command = binDir + '/tws2twee'
      break;

    case '.html':
      command = binDir + '/html2twee'
      break;

    case '.tw2':
    case '.twee':
      // already a twee file, just copy
      command = 'cat'
      break;

    default:
      return cb(new Error('Cannot handle file with extension: ' + ext))
  }

  var cmd = command + ' ' + file.path + ' > ' + tweeFile
  console.log("Executing: " + cmd)

  exec(cmd, function(err, stdout, stderr) {
    if (err) return cb(err)
    cb(null, {ok: true, originalName: originalName, originalSize: file.size, inputFile: inputFile, tweeFile: tweeFile})
  })
}

exports.convertToTwee = convertToTwee
