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
        url: 'file_upload',
        type: 'POST',
        data: formData,
        async: true,
        cache: false,
        contentType: false,
        enctype: 'multipart/form-data',
        processData: false,
        success: show_result,
        error: handle_error,
      })
    }
    return false
  })

  function handle_error(error) {
    uploading = false
    update_upload_visibility()
    var err_text = JSON.stringify(error, null, 2)
    console.log(err_text)
    $('#result').text(err_text)
    $('#stdout').text("")
  }

  function show_result(response) {
    uploading = false
    update_upload_visibility()
    var stdout = response.stdout
    delete response.stdout
    var result_text = JSON.stringify(response, null, 2)
    console.log(response)
    $('#result').text(result_text)
    $('#stdout').text(stdout)
  }

})
