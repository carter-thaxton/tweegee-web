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
      show_result(error.responseJSON)
    } else {
      console.log("Received unexpected error")
      var err_text = JSON.stringify(error, null, 2)
      console.log(err_text)
      $('#result').text(err_text)
    }
  }

  function show_result(response) {
    var result = response.result
    delete response.result
    console.log(response)
    console.log(result)

    var result_text = ""
    if (response) result_text += JSON.stringify(response, null, 2)
    if (result) result_text += "\n\n" + JSON.stringify(result, null, 2)
    $('#result').text(result_text)
  }

})
