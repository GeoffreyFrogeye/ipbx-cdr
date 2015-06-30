// CDR OBJECT
function CDR() {
    this.allData = []; // All data collected
    this.data = []; // Data filtered in use
    // TODO Time selection
}

CDR.prototype = {
    // Data management
    update: function(cb) {
        if (this.allData.length) {
            // OPTZ Fetch only new data
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

        m = matcher.exec(expr);
        while (m) {

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

            m = matcher.exec(expr);
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

function parentData(el, includeEl) {
    if (includeEl === undefined) includeEl = false;
    var parents = $(el).parents(':data(calls)');
    if (includeEl) parents = parents.addBack(':data(calls)');
    parents = parents.last();
    return parents.length ? parents.data('calls') : cdr.data;
}

function updateFilter(fil, cb) { // Update a single filter
    // Defining vars
    fil = $(fil);
    var calls = parentData(fil, false);
    var filterDef = fil.data('filters');
    if (!filterDef) filterDef = [];

    function onceFiltered(calls) {
        fil.data('calls', calls);
        if (cb) cb(null, calls);
    }

    if (!calls.length) {
        onceFiltered([]);
        return;
    }

    // Defining filter functions
    async.map(filterDef, function findFilterFunction(fl, cbe) {
        var val = (function findFilterFunctionSync() {
            switch (fl.type) {
                case 'is':
                case 'not':
                case 'regexp':
                    // Comparison, need pattern
                    if (!calls[0][fl.field]) return "No such field for filter " + fl.type;
                    if (!fl.pattern) return "No pattern for filter " + fl.field;

                    switch (fl.type) {
                        case 'is':
                            return function isFilter(call, cbf) {
                                cbf(call[fl.field] == fl.pattern);
                            };
                        case 'not':
                            return function notFilter(call, cbf) {
                                cbf(call[fl.field] != fl.pattern);
                            };
                        case 'regexp':
                            var regexp = new RegExp(fl.pattern, fl.flags);
                            return function regexpFilter(call, cbf) {
                                cbf(call[fl.field].match(regexp));
                            };

                        default:
                            return "Filter type " + fl.type + "declared as string comparer but no handler defined";
                    }
                    break;

                case '==':
                case '!=':
                case '>':
                case '<':
                case '>=':
                case '<=':
                    // Number comparison, need number pattern
                    if (!calls[0][fl.field]) return "No such field for filter " + fl.type;
                    var pat = parseFloat(fl.pattern);
                    if (isNaN(pat)) return "Not a number pattern for filter " + fl.field;

                    switch (fl.type) {
                        case '==':
                            return function eqFilter(call, cbf) {
                                cbf(parseFloat(call[fl.field]) == pat);
                            };
                        case '!=':
                            return function neqFilter(call, cbf) {
                                cbf(parseFloat(call[fl.field]) != pat);
                            };
                        case '>':
                            return function gtFilter(call, cbf) {
                                cbf(parseFloat(call[fl.field]) > pat);
                            };
                        case '<':
                            return function ltFilter(call, cbf) {
                                cbf(parseFloat(call[fl.field]) < pat);
                            };
                        case '>=':
                            return function getFilter(call, cbf) {
                                cbf(parseFloat(call[fl.field]) >= pat);
                            };
                        case '<=':
                            return function letFilter(call, cbf) {
                                cbf(parseFloat(call[fl.field]) <= pat);
                            };
                        default:
                            return "Filter type " + fl.type + "declared as number comparer but no handler defined";
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
                    if (typeof filter == 'function') {
                        filter(call, function(res) {
                            cbev(res);
                        });
                    }
                }, cbF);
            }, onceFiltered);
        }
    });
}
a=[]
function updateStat(el, cb) {
    el = $(el);
    var calls = parentData(el, true);
    var stat = el.data('stat');
    switch (stat) {
        case 'table':
            var thead = $('thead', el);
            var fields = [];
            $('th', thead).each(function(i, field) {
                fields.push($(field));
            });
            var tbody = $('tbody', el);
            if (!tbody.length) tbody = $('<tbody>').appendTo(el);

            function fillTbody(cbf) {
                window.a.push(tbody);
                tbody.empty();
                async.each(calls, function addTr(call, cbm) {
                    var tr = $('<tr>').appendTo(tbody);
                    async.each(fields, function addTd(field, cbe2) {
                        tr.append($('<td>').text(call[field.data('fieldname')]));
                        cbe2();
                    }, cbm);
                }, cbf);
            }

            if (el.is('.tablesorter')) {
                if (el.not('.tablesorter-stickyHeader')) {
                    fillTbody(function updateTable() {
                        el.trigger('update', [true, function(table) {
                            cb();
                        }]);
                    });
                } else {
                    cb();
                }
            } else {
                fillTbody(function sortTable() {
                    el.addClass('tablesorter');
                    pagerTop = $('<div>')
                        .addClass('.pager')
                        .append($('<button>').text('«').addClass('first'))
                        .append($('<button>').text('<').addClass('prev'))
                        .append($('<span>').text('X to X of X rows').addClass('pagedisplay'))
                        .append($('<button>').text('>').addClass('next'))
                        .append($('<button>').text('»').addClass('last'))
                        .append(
                            $('<select>').addClass('pagesize')
                            .append([10, 20, 30, 50, 100, 200, 500, 1000].map(function generateOption(nb) {
                                return $('<option>').val(nb).text(nb);
                            }))
                        )
                        .insertBefore(el);
                    pagerBot = pagerTop.clone().insertAfter(el);
                    var pagerOptions = {
                        container: $.merge(pagerTop, pagerBot),
                        removeRows: false,
                        output: 'Calls {startRow} - {endRow} of {filteredRows} ({totalRows} total)',
                    };
                    el
                        .tablesorter({
                            sortList: fields.map(function(field, i) {
                                var dat = field.data('sort');
                                if (dat !== undefined) {
                                    return [i, dat];
                                }
                            }),
                            widgets: ['zebra', 'filter'],
                            widgetOptions: {
                                filter_formatter: fields.map(function(field) {
                                    switch (field.data('filter')) {
                                        case 'select2':
                                            return function($cell, indx) {
                                                return $.tablesorter.filterFormatter.select2($cell, indx, {});
                                            };
                                        default:
                                            return '';
                                    }
                                })
                            },
                        })
                        .data('pagerOptions', pagerOptions)
                        .tablesorterPager(pagerOptions);
                    cb();
                });
            }
            return;

        case 'count':
        case '#count':
            el.text(calls ? calls.length : 0);
            break;

        default:
            if (calls && calls.length) {
                calls = calls.transposeObjects(); // Inversing table
                var field = el.data('field'),
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
                    // If numbering stat, use simple-statistics
                    el.text(ss[stat](x));
                } else if (!numbers && C3_N_FUN.indexOf(stat) != -1) {
                    // If it's a N-chart
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
                                    // unload: columnsToUnload, // Too quick for C3 to handle
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
                    // Other type of stats
                    var statType = (numbers ? '#' : '') + stat;
                    switch (statType) {
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
            break;
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

    $('.dateFilter').each(function() {
        var filter = $(this);
        var A = [$('input[type=date].A'), $('input[type=time].A')];
        var B = [$('input[type=date].B'), $('input[type=time].B')];
        var bNowI = $('input[type=checkbox][name=bNow]');
        var bNow = true;

        function inputs(fun, cbf) {
            async.each([A, B], function(X, cbe) {
                async.each(X, fun, cbe);
            }, cbf);
        }

        function getDate(els) {
            return new Date(els[0].val() + ' ' + els[1].val());
        }

        function dateChange() {
            var a = getDate(A);
            var b = bNow ? new Date() : getDate(B);
            filters = [];
            if (a <= b) {
                filters.push({
                    type: '>=',
                    field: 'calldate',
                    pattern: a.getTime(),
                });
                if (!bNow) {
                    filters.push({
                        type: '<=',
                        field: 'calldate',
                        pattern: b.getTime(),
                    });
                }
                inputs(function(el) {
                    el.css('color', '');
                });
            } else {
                inputs(function(el) {
                    el.css('color', 'red');
                });
            }
            filter.data('filters', filters);
            changed(filter);
        }

        function setDate(els, date) {
            els[0].val(date.getFullYear() + '-' + ("0" + (date.getMonth() + 1)).slice(-2) + '-' + ("0" + date.getDate()).slice(-2));
            els[1].val(("0" + (date.getHours())).slice(-2) + ':' + ("0" + (date.getMinutes())).slice(-2));
        }

        setDate(B, new Date());
        setInterval(function upBnow() {
            if (bNow) {
                setDate(B, new Date());
            }
        }, 60000);

        bNowI.bind('change', function() {
            bNow = $(this).is(':checked');
            if (bNow) {
                setDate(B, new Date());
            }
            dateChange();
        });

        async.each(B, function listenStopBnow(el, cba) {
            el.bind('change', function stopBnow() {
                bNow = false;
                bNowI.attr('checked', false);
            });
        });

        inputs(function(el) {
            el.bind('change', dateChange);
        });

        cdr.once('freshData', function(calls) {
            setDate(A, new Date(calls[0].calldate));
        });

    });

    $('[data-filter],[data-filter-field]').each(function extractFiltersFromDOM() {
        var t = $(this);
        var f = t.data('filters');
        if (!f) f = [];
        var type = t.data('filter');
        var flags = t.data('filter-flags');
        f.push({
            type: type ? type : (flags !== undefined ? 'regexp' : 'is'),
            field: t.data('filter-field'),
            pattern: t.data('filter-pattern'),
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
                            type: 'is',
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
    // $('.placeholder').css('color', 'gray');
    // $('.placeholder input').attr('disabled', 'true');
});
