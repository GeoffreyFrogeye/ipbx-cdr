// CDR OBJECT
function CDR() {
    this.data = [];
    // TODO Time selection
    this.timeA = null; // From the begining
    this.timeB = null; // Up to now

    this.updateAll();
}

CDR.prototype = {
    update: function() {
        // OPTZ Increment
        this.updateAll();
    },
    updateAll: function() {
        var that = this;
        $.get('ajax/cdr_all')
            .done(function(text) {
                that.data = JSON.parse(text);
                that.emit('freshData', that.data);
            });
    }
};

// Inherit from EventEmitter
for (var key in EventEmitter.prototype) {
    CDR.prototype[key] = EventEmitter.prototype[key];
}

// UTILITY FUNCTIONS
function queryDB(cb) {
    var status = $('.db .status');
    status.text('querying...');
    $.get('ajax/db')
        .done(function() {
            status.text('OK');
        })
        .fail(function(xhr) {
            status.text('failing');
            console.error(xhr.responseText);
        })
        .always(function(xhr) {
            cb(xhr.responseText);
        });
}

function updateOverviewCalls(data) {
    // TODO Other categories
    var selector = $('.overview .calls .all');

    $('.total', selector).text(data.length);

    var answered = 0,
        missed = 0;
    async.each(this.data, function(call, cb) {
        if (call.disposition == 'ANSWERED') {
            answered++;
        } else {
            missed++;
        }
        cb(null);
    }, function() {
        $('.answered', selector).text(answered);
        $('.missed', selector).text(missed);
    });
}

// MAIN
var cdr = null;

$(function() {
    async.parallel([
        queryDB,
        function() {
            cdr = new CDR();
            cdr.on('freshData', updateOverviewCalls);
        }
    ]);

    $('.placeholder').css('color', 'gray');
    $('.placeholder input').attr('disabled', 'true');
});
