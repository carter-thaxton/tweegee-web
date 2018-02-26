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
      console.log("Sending file...")
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

  function handle_error(error) {
    if (error.responseJSON) {
      // tweegee response will be 400 if there are errors, but still continue to display
      show_result(error.responseJSON)
    } else {
      var err_text = JSON.stringify(error, null, 2)
      console.log("Received unexpected error")
      console.log(err_text)
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
    $('#passage_count').text(story.passageCount)
    $('#story').show()
  }

  function show_error(msg, err) {
    var div = $('<div class="error"/>')
    function addLine(line) {
      div.append($('<div/>').text(line))
    }

    addLine(msg)
    if (err) {
      addLine("Line " + err.passageLineNumber + " in passage: " + err.passage)
      addLine(err.line)
    }
    $('#errors').append(div)
  }

})
