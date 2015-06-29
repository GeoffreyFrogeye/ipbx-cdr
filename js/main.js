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

(function() {

    var matcher = /\s*(?:((?:(?:\\\.|[^.,])+\.?)+)\s*([!~><=]=|[><])\s*("|')?((?:\\\3|.)*?)\3|(.+?))\s*(?:,|$)/g;

    function resolve(element, data) {

        data = data.match(/(?:\\\.|[^.])+(?=\.|$)/g);

        var cur = jQuery.data(element)[data.shift()];

        while (cur && data[0]) {
            cur = cur[data.shift()];
        }

        return cur || undefined;

    }

    jQuery.expr[':'].data = function(el, i, match) {

        matcher.lastIndex = 0;

        var expr = match[3],
            m,
            check, val,
            allMatch = null,
            foundMatch = false;

        while (m = matcher.exec(expr)) {

            check = m[4];
            val = resolve(el, m[1] || m[5]);

            switch (m[2]) {
                case '==':
                    foundMatch = val == check;
                    break;
                case '!=':
                    foundMatch = val != check;
                    break;
                case '<=':
                    foundMatch = val <= check;
                    break;
                case '>=':
                    foundMatch = val >= check;
                    break;
                case '~=':
                    foundMatch = RegExp(check).test(val);
                    break;
                case '>':
                    foundMatch = val > check;
                    break;
                case '<':
                    foundMatch = val < check;
                    break;
                default:
                    if (m[5]) foundMatch = !!val;
            }

            allMatch = allMatch === null ? foundMatch : allMatch && foundMatch;

        }

        return allMatch;

    };

}()); // From http://stackoverflow.com/a/2895933

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

// STATS FUNCTIONS
var SS_X_FUN = ['mean', 'sum', 'mode', 'variance', 'standard_deviation', 'standard_deviation', 'median', 'geometric_mean', 'harmonic_mean', 'root_mean_square', 'min', 'max', 'sample_variance'];
var C3_N_FUN = ['bar', 'pie', 'donut'];

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

function updateFilter(fil, cb) { // Update a single filter
    // Defining vars
    fil = $(fil);
    var parentData = fil.parents(':data(calls)').first();
    var calls = parentData.length ? parentData.data('calls') : cdr.data;
    var filterDef = fil.data('filters');
    if (!filterDef) filterDef = [];

    // Defining filter functions
    async.map(filterDef, function findFilterFunction(fl, cbe) {
        var val = (function findFilterFunctionSync() {
            switch (fl.type) {
                case 'simple':
                case 'regexp':
                    if (!calls[0][fl.field]) return "No such field for filter " + fl.type;
                    if (!fl.pattern) return "No pattern field for filter " + fl.field;
                    if (fl.type == 'simple') {
                        return function simpleFilter(call, cbf) {
                            cbf(call[fl.field] == fl.pattern);
                        };
                    } else { // fl.type == 'regexp'
                        var regexp = new RegExp(fl.pattern, fl.flags);
                        return function regexpFilter(call, cbf) {
                            cbf(call[fl.field].match(regexp));
                        };
                    }
                    break;

                case 'first':
                    // OPTZ Better handling
                    return function firstFilter(call, cbf) {
                        cbf(call == calls[0]);
                    };

                case 'last':
                    // OPTZ Better handling
                    return function lastFilter(call, cbf) {
                        cbf(call == calls[calls.length - 1]);
                    };

                    // TODO Date ≥/≤ filter

                default:
                    cb("Unknown filter type " + fl.type);
            }
        })();

        if (typeof val == 'function') {
            cbe(null, val);
        } else {
            cbe(val);
        }

    }, function executeFilters(err, filters) {
        if (err) {
            console.warn(err);
            fil.data('calls', []);
        } else {
            async.filter(calls, function applyFilters(call, cbF) {
                async.every(filters, function applyOneFilter(filter, cbev) {
                    filter(call, function(res) {
                        cbev(res);
                    });
                }, cbF);
            }, function onceFiltered(calls) {
                fil.data('calls', calls);
                if (cb) cb(null, calls);
            });
        }
    });
}

function updateStat(el, cb) {
    el = $(el);
    var parentData = el.parents(':data(calls)').addBack(':data(calls)').last();
    var calls = parentData.length ? parentData.data('calls') : cdr.data;
    if (calls && calls.length) {
        calls = calls.transposeObjects();
        var field = el.attr('data-field'),
            stat = el.attr('data-stat'),
            x = calls[field];
        if (!x) {
            cb("No such field " + field);
        }
        var numbers = typeof x[0] == 'number'; // Are numbers

        var occurs = null; // Calculates number of occurences
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


        if (numbers && SS_X_FUN.indexOf(stat) != -1) {
            el.text(ss[stat](x));
        } else if (!numbers && C3_N_FUN.indexOf(stat) != -1) {
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

                case 'undefined':
                case '#undefined':
                case 'first':
                case '#first':
                    el.text(x[0]);
                    break;

                case 'last':
                case '#last':
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

function changed(el, cb) {
    async.each($(':data(filters)', el).addBack(':data(filters)'), function updateFilters(el, cbe) {
        updateFilter(el, cbe);
    }, function() {
        async.each($('[data-stat],[data-field]'), function updateStats(el, cbe) {
            updateStat(el, cbe);
        }, cb);
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
                changed(document);
            });
            cdr.update();
            setInterval(function() {
                cdr.update();
            }, 10000);
        }
    ]);

    $('[data-filter],[data-filter-field]').each(function extractFiltersFromDOM() {
        var t = $(this);
        var f = t.data('filters');
        if (!f) f = [];
        var type = t.attr('data-filter');
        var flags = t.attr('data-filter-flags');
        f.push({
            type: type ? type : (flags !== undefined ? 'regexp' : 'simple'),
            field: t.attr('data-filter-field'),
            pattern: t.attr('data-filter-pattern'),
            flags: flags,
        });
        t.data('filters', f);
    });

    $('.caller').each(function() {
        var caller = $(this);
        $('input[name=name]', caller).bind('change keyup paste', function() {
            var input = $(this),
                num = input.val();
            cdr.callerExists(num, function(exists) {
                if (num) {
                    if (exists) {
                        caller.data('filters', [{
                            type: 'simple',
                            field: 'src',
                            pattern: num,
                        }]);
                        changed(caller);
                        input.css('color', '');
                    } else {
                        input.css('color', 'red');
                    }
                } else {
                    caller.data('filters', []);
                    changed(caller);
                    input.css('color', '');
                }
            });
        });
    });

    $('.placeholder').css('display', 'none');
    $('.placeholder').css('color', 'gray');
    $('.placeholder input').attr('disabled', 'true');
});
