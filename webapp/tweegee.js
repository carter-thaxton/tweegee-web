
var path = require('path')
var exec = require('child_process').exec

var binDir = path.join(__dirname, '../bin')
var twineDir = path.join(__dirname, '../twine-files')

var BUILTINS = {
  'Lifeline':   twineDir + '/Lifeline.tw2',
  'LLHTI':      twineDir + '/LLHTI.tw2',
  'Playlist':   twineDir + '/Playlist.tw2',
  'Test':       twineDir + '/Test.tw2',
}

function processRequest(req, cb) {
  var builtin = req.params.builtin || req.body.builtin
  if (builtin) {
    var builtinFile = BUILTINS[builtin]
    if (builtinFile) {
      runTweegee(builtinFile, handleTweegeeResult)
    } else {
      return cb(new Error('Could not find builtin: ' + builtin))
    }
  } else if (req.file) {
    convertToTwee(req.file, function(err, conversion) {
      if (err) return cb(err, conversion)
      runTweegee(conversion.tweeFile, handleTweegeeResult)
    })
  } else {
    cb(new Error('Either upload a file or request a builtin'))
  }

  function handleTweegeeResult(err, stdout) {
    var data = {}
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
  }
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

module.exports = processRequest
