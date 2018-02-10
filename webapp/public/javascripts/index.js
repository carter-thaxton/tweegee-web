$(function() {
  console.log("Loaded!")

  $('form').submit(function(evt) {
    evt.preventDefault();
    var formData = new FormData($(this)[0]);
    $.ajax({
      url: 'file_upload',
      type: 'POST',
      data: formData,
      async: true,
      cache: false,
      contentType: false,
      enctype: 'multipart/form-data',
      processData: false,
      success: function(response) {
        console.log(response);
      }
    });
    return false;
  });

});
