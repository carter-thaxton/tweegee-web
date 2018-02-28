$(function() {
  var uploading = false

  function update_upload_visibility() {
    var disabled
    if (uploading) {
      disabled = true
    } else {
      var file = $('#file').val().trim()
      disabled = !file
    }
    $('#submit').prop('disabled', disabled)
  }

  $('#file').change(update_upload_visibility)
  update_upload_visibility()

  // Setup form upload
  $('#upload_form').submit(function(evt) {
    evt.preventDefault()
    var file = $('#file').val().trim()
    if (file) {
      var formData = new FormData($(this)[0])
      uploading = true
      update_upload_visibility()

      $('#errors').empty()
      $('#story').hide()

      $.ajax({
        url: 'tweegee',
        type: 'POST',
        data: formData,
        async: true,
        cache: false,
        contentType: false,
        enctype: 'multipart/form-data',
        processData: false,
        success: show_result,
        error: handle_error,
        complete: function() { uploading = false; update_upload_visibility() },
      })
    }
    return false
  })

  $('#start').click(start)

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

    window.twee_engine = new TweeEngine(story)
  }

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

  function scrollToBottom() {
    document.body.scrollIntoView(false)
  }


  function nextAction() {
    var action = twee_engine.getNextAction()
    showAction(action)
  }

  function showAction(action) {
    switch (action.action) {
      case 'message':
        showMessage(action.text)
        nextAction()
        break

      case 'delay':
        showDelay(action.text, action.delay)
        nextAction()
        break

      case 'choice':
        showChoice(action.choices)
        break

      case 'end':
        showEnd()
        break

      default:
        throw new Error('Unknown action: ' + action.action)
    }

    scrollToBottom()
  }

  function showMessage(text) {
    div('message').text(text).appendTo('#messages')
  }

  function showDelay(text, delay) {
    div('delay').text(delay + " - " + text).appendTo('#messages')
  }

  function showChoice(choices) {
    var d = div('choice')
    choices.forEach(function(ch) {
      $('<button/>', {
        text: ch.title || ch.name,
        click: function() { makeChoice(ch.name) },
      }).appendTo(d)
    })
    d.appendTo('#messages')
  }

  function makeChoice(choice) {
    twee_engine.gotoPassage(choice)
    nextAction()
  }

  function showEnd() {
    div('end').text("THE END ")
      .append($('<button/>', {
        text: 'Reset story',
        click: reset
      }))
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
    scrollToBottom()
  }

})
