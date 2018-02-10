$(function() {

  // Setup form upload
  $('form').submit(function(evt) {
    evt.preventDefault();
    var file = $('#file').val().trim();
    if (file) {
      var formData = new FormData($(this)[0]);
      console.log("Sending file...");
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
      });
    } else {
      console.log("No file selected");
    }
    return false;
  });

  function handle_error(error) {
    alert(JSON.stringify(error, null, 2));
  }

  function show_result(response) {
    console.log(response);
    var result_text = JSON.stringify(response, null, 2);
    $('.results').text(result_text);
  }

});
