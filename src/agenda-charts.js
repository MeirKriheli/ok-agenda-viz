define(['../lib/d3.v2', 'agenda-tooltips'], function () {

    // some utilities
    function prop (p) {
        return function (obj) {
            return obj[p];
        };
    }
    function extend (target, source) {
        var k;
        for ( k in source ) {
            target[k] = source[k];
        }
        return target;
    }
    function defined (arg, def) {
        return arg == null ? def : arg;
    }

    var d3 = window.d3;

    function Chart (options) {
        var that = this;
        this.setData(options.data);
        // set chart dimensions
        this.height = options.height || 200;
        this.width = options.width || 500;
        this.padding = options.padding || {
            x   : 30,
            y   : 30
        };
        this.domains = options.domains;
        this.ranges = options.ranges;
        this.mouseover = function(d,i) {
            that.showDetails(d, i, this);
            options.mouseover(d, i, this);
        };
        this.mouseout = function(d, i) {
            that.hideDetails(d, i, this);
            options.mouseout(d, i, this);
        };
        this.click = options.click;
        this.touchstart = options.touchstart;
        this.no_axes = options.no_axes;
        // create the chart's canvas
        this.svg = options.svg || d3.select(options.container || 'body')
            .append('svg')
            .attr('width', this.width)
            .attr('height', this.height);
    }

    Chart.prototype = {
        constructor     : Chart,
        setXDomain      : function (min, max, med) {
            var x_min, x_max, x_med;
            if ( this.domains ) {
                x_min = defined(this.domains[0], null);
                x_max = defined(this.domains[1], null);
                x_med = defined(this.domains[2], null);
            }
            this.x_in_min = defined(min, defined(x_min, -100));
            this.x_in_max = defined(max, defined(x_max, 100));
            this.x_in_med = defined(med, defined(x_med, 0));
            return this;
        },
        setYDomain      : function () {
            // set Y scale min and max
            this.y_in_min = 0;
            this.y_in_max = d3.max(this.data, prop(1)); // by volume
            return this;
        },
        setDomains      : function () {
            this.setXDomain()
                .setYDomain();
            return this;
        },
        setXScale       : function () {
            // set X scale
            this.x_scale = d3.scale.linear()
                .domain([this.x_in_min, this.x_in_max])
                .range([this.x_out_min, this.x_out_max]);
            return this;
        },
        setYScale       : function () {
            // set Y scale
            this.y_scale = d3.scale.linear()
                .domain([this.y_in_min, this.y_in_max])
                .range([this.y_out_min, this.y_out_max]);
            // set ranges' values
            return this;
        },
        setColorScale   : function () {
            // set the color scale
            this.color_scale = d3.scale.linear()
                .domain([this.x_in_min, this.x_in_med, this.x_in_max])
                .range(['red', 'gray', 'green']);
            return this;
        },
        setScales       : function () {
            this.setDomains()
                .setRanges()
                .setXScale()
                .setYScale()
                .setColorScale();
            return this;
        },
        createAxes      : function () {
            if ( ! this.no_axes ) {
                // create X axis
                this.x_axis = d3.svg.axis();
                this.x_axis.scale(this.x_scale);
                // draw axes
                this.svg.call(this.x_axis);
            }
            return this;
        },
        addEvents       : function () {
            this.svg.selectAll(this.element).on('mouseover', this.mouseover, false)
                                            .on('mouseout', this.mouseout, false)
                                            .on('click', this.click, false)
                                            .on('touchstart', this.touchstart, false);
            return this;
        },
        draw            : function () {
            if ( ! this.selection ) {
                this.render()
                    .selection.all.call(this.transition, this);
            }
            else {
                this.svg.data(this.data).selectAll(this.element);
//                all.exit().call(this.transition, this, true);
//                all.enter().call(this.transition, this);
            }
            return this;
        },
        showDetails: function(data, i, element) {
            d3.select(element).attr("stroke", "black");
            var content = data[3];
            return this.tooltip.showTooltip(content, d3.event);
        },
        hideDetails: function(data, i, element) {
            return this.tooltip.hideTooltip();
        }
    };

    function PartiesChart (options) {
        var chart = this;
        this.tooltip = Tooltip("parties_tooltip", 200);

        Chart.call(this, options);
        this.element = 'circle';
    }

    PartiesChart.prototype = extend(Object.create(Chart.prototype), {
        constructor : PartiesChart,
        setData     : function (data) {
            this.data = data.map(function(party) {
                // value | 0 is the same as Math.round(value)
                return [
                    party.score | 0, //0
                    party.volume | 0,//1
                    party.size | 0,  //2
                    party.name,      //3
                    party.id         //4
                ];
            }).sort(function (a, b) {
                // sort from the large to the small ones, to make sure they don't cover each other entirely
                return b[2] - a[2];
            });
            return this;
        },
        setRanges   : function (x_min, x_max, y_min, y_max, r_min, r_max) {
            // if ranges was set in options
            if ( this.ranges && ! this.ranges_set ) {
                this.ranges_set = true;
                // use it to override the defaults
                return this.setRanges.apply(this, this.ranges);
            }
            this.x_out_min = defined(x_min, this.padding.x);
            this.x_out_max = defined(x_max, this.width - this.padding.x);
            this.y_out_min = defined(y_min, this.height - this.padding.y - this.r_in_max * 2);
            //TODO: just placing them in the middle for now until we have proper volume - then change range's max
            this.y_out_max = defined(y_max, this.height / 2);
            this.r_out_min = defined(r_min, this.r_in_min * 2);
            this.r_out_max = defined(r_max, this.r_in_max * 2);
            return this;
        },
        setRDomain  : function () {
            var getSize = prop(2);
            // set R scale min and max
            this.r_in_max = d3.max(this.data, getSize);
            this.r_in_min = d3.min(this.data, getSize);
            return this;
        },
        setRScale   : function () {
            // set R scale
            this.r_scale = d3.scale.linear()
                .domain([this.r_in_min, this.r_in_max])
                .range([this.r_out_min, this.r_out_max]);
            return this;
        },
        setScales   : function () {
            this.setRDomain();
            Chart.prototype.setScales.call(this);
            this.setRScale();
            return this;
        },
        render      : function (complete) {
            var chart = this;

            this.selection = {
                all     : null
            };
            this.selection.all = this.setScales()
                .createAxes()
                .svg.selectAll(this.element)
                .data(this.data)
                .enter()
                // add the parties' circles
                .append(this.element)
                // position the circles
                //TODO: make sure they don't cover each other
                .attr('cx', function(d) {
                    return chart.x_scale(d[0]);
                })
                .attr('cy', function(d) {
                    return chart.y_scale(d[1]);
                })// if not `complete` then radii initially set to 0 and then transitioned
                .attr('r', ! complete ? 0 : function (d) {
                    chart.r_scale(d[2]);
                })
                // paint
                .attr('fill', function(d) {
                    return chart.color_scale(d[0]);
                })
                .attr('fill-opacity', .7)
                .attr('stroke', '#222222');
            this.addEvents();
            return this;
        },
        transition  : function (selection, chart, transit_out) {
            // transition the radii of all circles
            selection.transition()
                .duration(750)
                .delay(transit_out ? 0 : function(d, i) {
                    return i * 50;
                })
                .attr('r', transit_out ? 0 : function(d) {
                    return chart.r_scale(d[2]);
                });
            return chart;
        },
        zoom        : function (is_in) {
            //TODO: add transition to scale change
            var chart = this,
                getScore = prop(0);
            // if `is_in` is not specified then toggle state
            if ( ! arguments.length ) {
                is_in = ! this.zoom_in;
            }
            // set state
            this.zoom_in = is_in;
            is_in ?
                this.setXDomain() :
                this.setXDomain(-100, 100);
            this.setRanges()
                .setXScale()
                .createAxes();
            // change data to new selection and redraw the selected party
            this.svg.data(this.data).selectAll(this.element)
                //TODO: tween with other events
                .transition().delay(500).duration(500)
                .attr('cx', function(d, i) {
                    return chart.x_scale(d[0]);
                });
            return this;
        }
    });

    function MembersChart (options) {
        Chart.call(this, options);
        this.bar_padding = options.bar_padding || 1;
        this.stroke = options.stroke || 1;
        this.element = 'rect';
        this.parties_toggle = {};
        this.zoom_in = false;
        this.tooltip = Tooltip("members_tooltip", 200);

    }

    MembersChart.prototype = extend(Object.create(Chart.prototype), {
        constructor : MembersChart,
        setData     : function (data) {
            this.data = data.map(function(member) {
                return [
                    member.score,   //0
                    member.volume,  //1
                    member.rank,    //2
                    member.name,    //3
                    member.party,   //4
                    member.party_id,//5
                    member.id       //6
                ];
            }).sort(function (a, b) {
                return a[0] - b[0];
            });
            return this;
        },
        setRanges   : function (x_min, x_max, y_min, y_max) {
            // if ranges was set in options
            if ( this.ranges && ! this.ranges_set ) {
                this.ranges_set = true;
                // use it to override the defaults
                return this.setRanges.apply(this, this.ranges);
            }
            this.x_out_min = defined(x_min, this.padding.x); 
            this.x_out_max = defined(x_max, this.width - this.padding.x); 
            this.y_out_min = defined(y_min, this.height - this.padding.y); 
            this.y_out_max = defined(y_max, this.padding.y); 
            return this;
        },
        render      : function (complete) {
            var chart = this,
                w = this.width / this.data.length,
                bar_width = (w - chart.bar_padding - chart.stroke) | 0 || 1;

            this.selection = {
                all     : null,
                getParty: function (id) {
                    if ( !(id in this.parties) ) {
                        this.parties[id] = this.all.filter(function (d, i) {
                            return d[5] === id;
                        });
                    }
                    return this.parties[id];
                },
                parties : {}
            };
            this.selection.all = this.setScales()
                .createAxes()
                .svg.selectAll(this.element)
                .data(this.data)
                .enter()
                // add the member's rectangle
                .append(this.element)
                .attr('x', function(d, i) {
                    return chart.x_scale(d[0]);
                })
                .attr('y', ! complete ? chart.height - chart.padding.y : function(d) {
                    return chart.y_scale(d[1]);
                })
                .attr('width', bar_width)
                // if not `complete` then height starts at 0 and then transitioned according to chart height and y_scale
                .attr('height', ! complete ? 0 : function(d) {
                    return chart.height - chart.padding.y - chart.y_scale(d[1]);
                })
                .attr('fill-opacity', .7)
                .attr('fill', function(d) {
                    return chart.color_scale(d[0]);
                })
                .attr('stroke', '#222222');
            if ( complete ) {
                this.parties_toggle[0] = true;
                this.select();
            }
            this.addEvents();
            return this;
        },
        select      : function (id, dont_set) {
            var selection = arguments.length ? this.selection.getParty(id) : this.selection.all;
            if ( ! dont_set ) {
                this.selection.current = selection;
            }
            return selection;
        },
        toggle      : function (party, show_hide) {
            var id;
            // if party is NOT party_id but a selection
            id = typeof party === 'number' ? party : party.data()[0][5];
            // toggle state
            this.parties_toggle[id] = ! this.parties_toggle[id];
            // whether to also turn on/off visual state
            if ( show_hide ) {
                this.parties_toggle[id] ? this.show(id, true) : this.hide(id, true);
            }
            return this;
        },
        show        : function (party, override_persist) {
            var id;
            // if party is NOT party_id but a selection
            id = typeof party === 'number' ? party : party.data()[0][5];
            // get old state
            // if we're allowed to toggle the persistent state or it's not persistent
            if ( override_persist || ! this.parties_toggle[id] ) {
                // turn on persistency if `override_persist` is `true`
                override_persist && (this.parties_toggle[id] = true);
                // if toggling to active then select
                this.select(id)
                    // transition in or out according to new state - `true` => 'out'
                    .call(this.transition, this);
            }
            return this;
        },
        hide        : function (party, override_persist) {
            var id;
            // if party is NOT party_id but a selection
            id = typeof party === 'number' ? party : party.data()[0][5];
            // get old state
            // if we're allowed to toggle the persistent state or it's not persistent
            if ( override_persist || ! this.parties_toggle[id] ) {
                // disable persistency if `override_persist is `true`
                override_persist && (this.parties_toggle[id] = false);
                // if toggling to active then select
                this.select(id, true)
                    // transition in or out according to new state - `true` => 'out'
                    .call(this.transition, this, true);
            }
            return this;
        },
        transition  : function (selection, chart, transit_out) {
            // transition the radii of all circles
            selection.transition()
                .duration(750)
                .delay(function(d, i) {
                    return i * 10;
                }).attr('height', transit_out ? 0 : function(d) {
                    return chart.height - chart.padding.y - chart.y_scale(d[1]);
                }).attr('y', transit_out ? chart.height - chart.padding.y : function(d) {
                    return chart.y_scale(d[1]);
                });
            return chart;
        },
        zoom        : function (is_in) {
            //TODO: add transition to scale change
            var chart = this,
                getScore = prop(0),
                scope;
            // if `is_in` is not specified then toggle state
            if ( ! arguments.length ) {
                is_in = ! this.zoom_in;
            }
            else if ( typeof is_in == 'string' ) {
                scope = is_in;
                is_in = true;
            }
            // set state
            this.zoom_in = is_in;
            // set data according to scope
            if ( is_in && scope !== 'all' ) {
                this.data = this.selection.current.data();
            }
            else {
                this.data = this.selection.all.data();
            }
            is_in ?
                this.setXDomain(d3.min(this.data, getScore), d3.max(this.data, getScore)) :
                this.setXDomain(-100, 100);
            this.setRanges()
                .setXScale()
                .createAxes();
            // change data to new selection and redraw the selected party
            this.svg.data(this.data).selectAll(this.element)
                //TODO: tween with other events
                .transition().delay(1000).duration(500)
                .attr('x', function(d, i) {
                return chart.x_scale(d[0]);
            });
            return this;
        }
    });

    return {
        PartiesChart: PartiesChart,
        MembersChart: MembersChart
    };
});