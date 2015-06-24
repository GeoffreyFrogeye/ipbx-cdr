// CDR OBJECT
function CDR() {
    this.allData = []; // All data collected
    this.data = []; // Data filtered in use
    // TODO Time selection
    this.timeA = null; // From the begining
    this.timeB = null; // Up to now

    this.updateAll();
}

CDR.prototype = {
    // Data management
    update: function(cb) {
        // OPTZ Increment
        this.updateAll(cb);
    },
    updateAll: function(cb) {
        var that = this;
        $.get('ajax/cdr_all')
            .done(function(text) {
                that.allData = JSON.parse(text);
                that.filterData(cb);
            })
            .fail(function(data) {
                if (cb) cb(data.status);
            });
    },
    filterData: function(cb) {
        this.data = this.allData; // PLACEHOLDER
        this.emit('freshData', this.data);
        if (cb) cb(null, this.data);
    },

    // Statistics generation
    callerExists: function(caller, cb) {
        async.some(this.data,
            function exists(call, cba) {
                cba(call.src == caller || call.dst == caller);
            },
            cb
        );
    },

    srcStats: function(src, cb) {
        var that = this;
        async.filter(this.data,
            function filter(call, cba) {
                cba(call.src == src);
            },
            function then(calls) {
                async.reduce(
                    calls,
                    stats = {
                        dst: [],
                        context: [],
                        duration: [],
                        billsec: [],
                    },
                    function fillLists(stats, call, cba) {
                        for (var item in stats) {
                            stats[item].push(call[item]);
                        }
                        cba(null, stats);
                    },
                    cb
                );
            }
        );
    },
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

function fillStat(el, stats) {
    el = $(el);
    var fieldName = el.attr('data-field'),
        field = stats[fieldName];
    if (field) {
        if (field.length) {

            var stat = el.attr('data-stat'),
                type = typeof field[0],
                statType = (type == 'number' ? '#' : '') + el.attr('data-stat');

            switch (statType) {
                case '#max':
                    el.text(ss.max(stats.duration));
                    break;

                case '#min':
                    el.text(ss.min(stats.duration));
                    break;

                default:
                    el.text("???");
                    console.warn("Unknown stat type", statType);
                    break;
            }
        } else {
            el.text("No data");
        }
    } else {
        console.warn("Unknown field", fieldName);
    }
}

function updateOverviewCalls(data) {
    // TODO Other categories
    var selector = $('.overview .calls .all');

    $('.total', selector).text(data.length);

    async.reduce(
        this.data, {
            answered: 0,
            missed: 0
        },
        function(stats, call, cb) {
            if (call.disposition == 'ANSWERED') {
                stats.answered++;
            } else {
                stats.missed++;
            }
            cb(null, stats);
        },
        function(err, stats) {
            $('.answered', selector).text(stats.answered);
            $('.missed', selector).text(stats.missed);
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

    $('.caller').each(function() {
        var caller = $(this);

        function updateCaller(num) {
            cdr.srcStats(num, function(err, stats) {
                var div = $('.src', caller);
                $('[data-stat]').each(function() {
                    // OPTZ Async?
                    fillStat(this, stats);
                });
            });
        }

        $('.caller input[name=name]').bind('change keyup paste', function() {
            var input = $(this),
                num = input.val();
            cdr.callerExists(num, function(exists) {
                if (exists) {
                    input.css('color', '');
                    updateCaller(num);
                } else {
                    input.css('color', 'red');
                }
            });
        });

    });

    $('.placeholder').css('color', 'gray');
    $('.placeholder input').attr('disabled', 'true');
});
