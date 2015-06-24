$(function() {
    $('#dbStatus').text('querying...');
    $.get('ajax/db.php')
        .done(function() {
            $('#dbStatus').text('OK');
        })
        .fail(function(data) {
            $('#dbStatus').text('failing');
            console.error(data.responseText);
        });
});
