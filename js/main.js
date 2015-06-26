// CDR OBJECT
function CDR() {
    this.allData = []; // All data collected
    this.data = []; // Data filtered in use
    // TODO Time selection
    this.timeA = null; // From the begining
    this.timeB = null; // Up to now
}

CDR.prototype = {
    // Data management
    update: function(cb) {
        if (this.allData.length) {
            if (!this.timeB) { // If up to now
                // OPTZ Fetch only new data
            }
        } else {
            this.updateAll(cb);
        }
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

    callerExists: function(caller, cb) {
        async.some(this.data,
            function exists(call, cba) {
                cba(call.src == caller || call.dst == caller);
            },
            cb
        );
    },
};

// Inherit from EventEmitter
for (var key in EventEmitter.prototype) {
    CDR.prototype[key] = EventEmitter.prototype[key];
}

// UTILITY FUNCTIONS
Array.prototype.diff = function(a) {
    return this.filter(function(i) {
        return a.indexOf(i) < 0;
    });
}; // From http://stackoverflow.com/a/4026828

Array.prototype.transposeObjects = function() {
    var that = this;
    if (this.length) {
        rep = {};
        return Object.keys(this[0]).reduce(function(memo, cur) {
            memo[cur] = that.map(function(row) {
                return row[cur];
            });
            return memo;
        }, {});
    } else {
        return {};
    }
}; // From http://stackoverflow.com/a/17428705

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

function fillStat(el) {
    el = $(el);
    async.waterfall([
        function filterCalls(cb) { // OPTZ Filter at filter elements, not stat elements
            var fieldName = el.attr('data-field'),
                calls = cdr.data;

            function applyFilter(filterElement, cbf) {
                filterName = filterElement.attr('data-filter-field');
                if (!calls[0][filterName]) {
                    cb("No such field for filter " + filterName);
                    return;
                }
                filterPattern = filterElement.attr('data-filter-pattern');
                if (!filterPattern) {
                    cb("No pattern field for filter " + filterName);
                    return;
                }
                var flags = filterElement.attr('data-filter-flags');
                async.filter(
                    calls,
                    function(call, cba) {
                        if (flags !== undefined) {
                            cba(call[filterName].match(new RegExp(filterPattern, flags)));
                        } else {
                            cba(call[filterName] == filterPattern);
                        }
                    },
                    function(data) {
                        calls = data;
                        cbf();
                    }
                );
            }
            async.parallel([
                function(cba) {
                    if (el.attr('data-filter-field')) {
                        applyFilter(el, cba);
                    } else {
                        cba();
                    }
                },
                function(cba) {
                    async.each(el.parents('[data-filter-field]'), function(data, cbe) {
                        applyFilter($(data), cbe);
                    }, function(err) {
                        cba(err);
                    });
                }

            ], function(err) {
                cb(err, calls.transposeObjects()[fieldName]);
            });

        },
        function(x, cb) {
            if (x && x.length) {
                var stat = el.attr('data-stat'),
                    numbers = typeof x[0] == 'number'; // Are numbers

                var occurs = null;
                if (!numbers) {
                    occurs = x.reduce(function(occ, cur) {
                        if (isNaN(occ[cur])) {
                            occ[cur] = 1;
                        } else {
                            occ[cur]++;
                        }
                        return occ;
                    }, {});
                }

                var ssXfun = ['mean', 'sum', 'mode', 'variance', 'standard_deviation', 'standard_deviation', 'median', 'geometric_mean', 'harmonic_mean', 'root_mean_square', 'min', 'max', 'sample_variance'];
                var c3Nfun = ['bar', 'pie', 'donut'];
                if (numbers && ssXfun.indexOf(stat) != -1) {
                    el.text(ss[stat](x));
                } else if (!numbers && c3Nfun.indexOf(stat) != -1) {
                    var columns = Object.keys(occurs).reduce(function assoc(memo, key) {
                            memo.push([key, occurs[key]]);
                            return memo;
                        }, []),
                        oldChart = el.data('chart');

                    if (oldChart) {
                        var columnsToUnload = Object.keys(oldChart.x())
                            .diff(columns.reduce(function(memo, key) {
                                memo.push(key[0]);
                                return memo;
                            }, []));
                        async.series([
                            function(cba) {
                                oldChart.load({
                                    columns: columns,
                                    // unload: columnsToUnload,
                                    done: cba,
                                });
                            },
                            function(cba) {
                                oldChart.unload({
                                    ids: columnsToUnload,
                                    done: cba,
                                });
                            }
                        ]);
                    } else {
                        var chartSpecs = {
                            data: {
                                columns: columns,
                                type: stat,
                            },
                            legend: {
                                position: 'right'
                            },
                        };
                        if (['pie', 'donut'].indexOf(stat) != -1) {
                            chartSpecs[stat] = {
                                label: {
                                    format: function(value) {
                                        return value;
                                    }
                                }
                            };
                        }
                        var chart = c3.generate(chartSpecs);
                        el.empty().append(chart.element).data('chart', chart);
                    }
                } else {
                    var statType = (numbers ? '#' : '') + stat;
                    switch (statType) {
                        case 'count':
                        case '#count':
                            el.text(x.length);
                            break;

                        case 'last':
                        case '#last':
                            el.text(x[x.length - 1]);
                            break;
                        case 'first':
                        case '#first':
                            el.text(x[x.length - 1]);
                            break;

                        default:
                            cb("Unknown stat type " + statType);
                            return;
                    }
                }
            } else {
                el.removeData();
                el.text("No data");
            }
            cb();
        }
    ], function(err) {
        if (err) {
            el.empty().text('???');
            console.warn(err);
        }
    });
}

// MAIN
var cdr = null;

$(function() {
    async.parallel([
        queryDB,
        function() {
            cdr = new CDR();
            cdr.on('freshData', function() {
                updateStats();
            });
            cdr.update();
            setInterval(function() {
                cdr.update();
            }, 10000);
        }
    ]);

    function updateStats(range) {
        if (!range) {
            range = document.body;
        }
        $('[data-stat]', range).each(function() {
            // OPTZ Async?
            fillStat(this);
        });
    }

    $('.caller').each(function() {
        var caller = this;
        $('input[name=name]', caller).bind('change keyup paste', function() {
            var num = $(this).val(),
                filter = $('[data-filter-field=src]', caller);
            filter.attr('data-filter-pattern', num ? num : ".*");
            if (num) {
                filter.removeAttr('data-filter-flags');
            } else {
                filter.attr('data-filter-flags', '');
            }
            updateStats(caller);
        });

    });

    $('.placeholder').css('display', 'none');
    $('.placeholder').css('color', 'gray');
    $('.placeholder input').attr('disabled', 'true');
});
