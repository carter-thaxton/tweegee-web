$(function() {
  var fetching_game = false

  // Setup form upload
  $('#upload_form').submit(function(evt) {
    evt.preventDefault()
    if ($('#file').val().trim()) {
      var formData = new FormData($(this)[0])
      upload_file(formData)
    }
    return false
  })

  // Setup builtins
  $('.builtin').click(function() {
    load_builtin($(this).text())
  })

  $('#start').click(start)

  $('#file').change(update_buttons)
  update_buttons()

  $('#debugger .show').click(toggleDebugger)
  toggleDebugger(true)


  function update_buttons() {
    if (fetching_game) {
      $('#submit').prop('disabled', true)
      $('.builtin').prop('disabled', true)
    } else {
      var file = $('#file').val().trim()
      $('#submit').prop('disabled', !file)
      $('.builtin').prop('disabled', false)
    }
  }

  function upload_file(formData) {
    post_tweegee({enctype: 'multipart/form-data', data: formData})
  }

  function load_builtin(builtin_name) {
    post_tweegee({contentType: 'application/json', data: JSON.stringify({ builtin: builtin_name })})
  }

  function post_tweegee(post_opts) {
    if (fetching_game) return
    fetching_game = true
    update_buttons()

    $('#errors').empty()
    $('#story').hide()
    $('#debugger').hide()

    var opts = {
      url: 'tweegee',
      type: 'POST',
      dataType: 'json',
      async: true,
      cache: false,
      contentType: false,
      processData: false,
      success: show_result,
      error: handle_error,
      complete: function() { fetching_game = false; update_buttons() },
    }

    $.extend(opts, post_opts)
    $.ajax(opts)
  }

  function handle_error(error) {
    if (error.responseJSON) {
      // tweegee response will be 400 if there are errors, but still continue to display
      show_result(error.responseJSON)
    } else {
      var err_text = JSON.stringify(error, null, 2)
      show_error("Unexpected error: " + err_text)
    }
  }

  function show_result(response) {
    if (response.error) {
      return show_error(response.error)
    }

    var story = response.result
    console.log(story)
    if (!story) {
      return show_error("No story in response")
    }

    // Show each error in the story
    if (story.errors) {
      story.errors.forEach(function (error) {
        show_error(error.message, error)
      })
    }

    // Show attributes of story
    $('#title').text(story.title || '')
    $('#author').text(story.author ? 'by ' + story.author : '')
    $('#passage_count').text(story.statistics.passageCount)
    $('#word_count').text(story.statistics.wordCount)
    $('#messages').empty()
    $('#story').show()
    $('#debugger').show()

    window.twee_engine = new TweeEngine(story)
    reset()
  }

  function show_error(msg, err) {
    var d = div('error')
    function addLine(line) {
      d.append(div().text(line))
    }

    addLine(msg)
    if (err) {
      addLine("Line " + err.passageLineNumber + " in passage: " + err.passage)
      addLine(err.line)
    }
    $('#errors').append(d)
  }

})


// globals

function div(a1, a2) {
  var opts = {}
  var t1 = $.type(a1)
  var t2 = $.type(a2)
  if (t1 === 'object') { opts = a1 }
  else if (t2 === 'object') { opts = a2 }
  if (t1 === 'string') { opts['class'] = a1 }
  else if (t2 === 'string') { opts['class'] = a2 }
  return $('<div/>', opts)
}

var messages_height = 0

function captureCurrentScroll() {
  messages_height = $('#messages').height()
}

function updateScroll() {
  requestAnimationFrame(function() {
    var new_messages_height = $('#messages').height()
    var scroll_offset = new_messages_height - messages_height
    var top = $(document).scrollTop()
    $(document).scrollTop(top + scroll_offset)
    messages_height = new_messages_height
  })
}


function nextAction(delay) {
  delay = delay || 0
  setTimeout(function() {
    var action = twee_engine.getNextAction()
    showAction(action)
  }, delay)
}

function showAction(action) {
  captureCurrentScroll()

  switch (action.action) {
    case 'message':
      showMessage(action.text)
      nextAction(50)
      break

    case 'delay':
      showDelay(action.text, action.delay)
      nextAction(500)
      break

    case 'choice':
      showChoice(action.choices)
      break

    case 'prompt':
      showPrompt(action.text)
      break

    case 'error':
      showError(action.error)
      break

    case 'end':
      showEnd()
      break

    default:
      throw new Error('Unknown action: ' + action.action)
  }

  updateDebugger()
  updateScroll()
}

function showMessage(text) {
  div('message').text(text).appendTo('#messages')
}

function showDelay(text, delay) {
  div('delay').text(text + "    (" + delay + ")").appendTo('#messages')
}

function showChoice(choices) {
  var d = div('choice')
  choices.forEach(function(ch) {
    $('<button/>', {
      text: ch.text,
      click: function() { makeChoice(ch.passage, this) },
    }).appendTo(d)
  })
  d.appendTo('#messages')
}

function makeChoice(choice, button) {
  if (button) {
    $(button).addClass('chosen')
  }
  $('.choice button').prop('disabled', true)  // disable all choices
  twee_engine.makeChoice(choice)
  nextAction()
}

function showPrompt(text) {
  var d = div('choice')
  $('<button/>', {
    text: text,
    click: function() {
      $(this).addClass('chosen')
      $('.choice button').prop('disabled', true)  // disable all choices
      nextAction()
    },
  }).appendTo(d)
  d.appendTo('#messages')
}

function showEnd() {
  div('end').text("THE END ")
    .append($('<button/>', {
      text: 'Reset story',
      click: reset
    }))
    .appendTo('#messages')
}

function showError(error) {
  div('error').text("Error occurred: " + error)
    .appendTo('#messages')
}

function start() {
  if (!twee_engine) return
  reset()
  nextAction()
}

function reset() {
  $('#messages').empty()
  twee_engine.resetStory()
  debugger_height = 100
  messages_height = 0
  updateDebugger()
}


// debugger
var debugger_height = 100

function toggleDebugger(makeVisible) {
  if (makeVisible !== true && makeVisible !== false) {
    makeVisible = !$('#debugger_contents').is(':visible');
  }
  if (makeVisible) {
    $('#debugger_contents').show()
    $('#debugger .show').text('hide debugger')
    growHeight()
  } else {
    $('#debugger_contents').hide()
    $('#debugger .show').text('show debugger')
    debugger_height = 100
    $('#debugger_contents').height('auto')
  }
}

function updateDebugger() {
  if (!twee_engine) return
  $('#code').empty()

  var passage = twee_engine.previousPassage()
  var stmt = twee_engine.previousStatement
  if (passage && stmt) {
    var code = passage.code
    for (var i=0; i < code.length; i+=1) {
      var line = $('<pre>').text(code[i])
      if (i == stmt.line) {
        line.addClass('highlighted')
      }
      $('#code').append(line)
    }
  }

  $('#variables').empty()
  var key
  for (key in twee_engine.variables) {
    var value = twee_engine.variables[key]
    var variable = $('<pre>').text(key + ' = ' + JSON.stringify(value))
    $('#variables').append(variable)
  }

  growHeight()
}

function growHeight() {
  var current_height = $('#measure_height').height()
  if (current_height > debugger_height) {
     debugger_height = current_height
   } else {
    $('#debugger_contents').height(debugger_height)
  }
}
