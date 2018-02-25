
var path = require('path')
var exec = require('child_process').exec

var binDir = path.join(__dirname, '../bin')

function processFile(file, opts, cb) {
  convertToTwee(file, function(err, data) {
    if (err) return cb(err, data)
    runTweegee(data.tweeFile, function(err, stdout) {
      if (err) {
        data.ok = false
        data.exitCode = err.code
      } else {
        data.ok = true
        data.exitCode = 0
      }
      try {
        data.result = JSON.parse(stdout)
      } catch (err) {
        data.stdout = stdout
      }
      cb(null, data)
    })
  })
}

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
    var data = {ok: false, originalName: originalName, originalSize: file.size, inputFile: inputFile, tweeFile: tweeFile}
    if (err) return cb(new Error('Could not convert file to twee2'), data)
    data.ok = true
    cb(null, data)
  })
}

// given a twee file, return stdout of executing tweegee
function runTweegee(tweeFile, cb) {
  var cmd = binDir + '/tweegee ' + tweeFile
  exec(cmd, {maxBuffer: 10 * 1024 * 1024}, cb)
}

module.exports = processFile
