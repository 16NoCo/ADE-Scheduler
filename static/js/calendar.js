import Vue from 'vue';
import { Modal, Popover, Tooltip, Collapse } from 'bootstrap';
import FullCalendar from '@fullcalendar/vue'
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import frLocale from '@fullcalendar/core/locales/fr';
import './base.js';
import '../css/calendar.css';

const axios = require('axios');

var popoverList = [];
var addEventModal = {};
var eventModal = {};
var courseModal = {};
var codeMenu = {};
var vm = new Vue({
    el: '#app',
    components: { FullCalendar },
    data: {
        codes: [],
        computing: true,
        error: false,
        saveSuccess: false,
        code: '',
        eventForm: {
            name: '',
            location: '',
            description: '',
            beginDay: '',
            endDay: '',
            beginHour: '',
            endHour: '',
            freq: [],
            beginRecurrDay: '',
            endRecurrDay: '',
            recurring: false,
        },
        courseInfo: {
            code: '',
            title: '',
            summary: {},
            filtered: {},
        },
        eventInfo: {
            event: {},
            rrule: {},
        },
        navBtn: false,
        calendarOptions: {
            plugins: [ dayGridPlugin, timeGridPlugin ],
            locales: [ frLocale ],
            locale: document.getElementById('current-locale').innerText.trim(),

            height: 'auto',
            slotMinTime: '08:00:00',
            slotMaxTime: '21:00:00',
            navLinks: true, // can click day/week names to navigate views
            editable: false,
            droppable: false,
            dayMaxEventRows: false, // allow "more" link when too many events
            allDaySlot: false,

            // Week display
            firstDay: 1,
            weekText: 'S',
            weekNumbers: true,
            weekNumberCalculation: (d) => {
                d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
                let yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
                return Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
            },

            // Header bar
            customButtons: {
                addEvent: {
                    text: '+',
                    click: () => { addEventModal.show(); }
                }
            },
            headerToolbar: {
                left: 'prev,next today addEvent',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek'
            },

            // Remember where the user left the calendar
            initialView: (localStorage.getItem("fcInitialView") !== null ? localStorage.getItem("fcInitialView") : 'timeGridWeek'),
            initialDate: (localStorage.getItem("fcInitialDate") !== null ? parseInt(localStorage.getItem("fcInitialDate")) : Date.now()),
            datesSet: function (arg) {
                localStorage.setItem("fcInitialView", arg.view.type);
                localStorage.setItem("fcInitialDate", arg.view.currentStart.getTime());
            },

            // Events
            events: [],
            eventTextColor: 'white',
            eventDisplay: 'block',
            eventDidMount: function (arg) {
                new Tooltip(arg.el, {
                    container: 'body',
                    title: arg.event.extendedProps.description,
                    sanitize: false,
                    template: `
                        <div class="tooltip" role="tooltip">
                            <div class="tooltip-arrow"></div>
                            <div class="tooltip-inner" style="background-color:` + arg.event.backgroundColor + `"></div>
                        </div>`,
                    placement: 'auto',
                });
            },
            eventClick: function(info) {
                let evt = info.event.toPlainObject({collapseExtendedProps: true});
                if (evt.id) {
                    vm.eventInfo = evt;
                    vm.eventInfo.event = info.event;
                    eventModal.show();
                } else {
                    vm.getDetails(evt.code);
                }
            }
        },
    },
    delimiters: ['[[',']]'],

    methods: {
        fetchData: function(e) {
            this.computing = true;
            axios({
                method: 'GET',
                url: Flask.url_for('calendar.get_data'),
            })
            .then(resp => {
                this.codes = resp.data.codes;
                this.calendarOptions.events = resp.data.events;
            })
            .catch(err => {
                this.error = true;
            })
            .then(() => {
                this.computing = false;
            });
        },
        clear: function(e) {
            this.computing = true;
            axios({
                method: 'DELETE',
                url: Flask.url_for('calendar.clear'),
            })
            .then(resp => {
                this.calendarOptions.events = [];
                this.codes = [];
            })
            .catch(err => {
                this.error = true;
            })
            .then(() => {
                this.computing = false;
            });
        },
        compute: function(e) {
            this.computing = true;
            axios({
                method: 'GET',
                url: Flask.url_for('calendar.compute'),
            })
            .then(resp => {
                console.log('Schedule computed successfuly !');
            })
            .catch(err => {
                this.error = true;
            })
            .then(() => {
                this.computing = false;
            });
        },
        save: function(e) {
            this.computing = true;
            axios({
                method: 'POST',
                url: Flask.url_for('calendar.save'),
            })
            .then(resp => {
                this.saveSuccess = true;
            })
            .catch(err => {
                if (err.response.status === 401) {
                    window.location.href = Flask.url_for('security.login');
                } else {
                    this.error = true;
                }
            })
            .then(() => {
                this.computing = false;
            });
        },
        addCode: function(e) {
            this.computing = true;
            axios({
                method: 'PATCH',
                url: Flask.url_for('calendar.add_code', {'code': this.code}),
            })
            .then(resp => {
                this.codes = this.codes.concat(resp.data.codes);
                this.calendarOptions.events = resp.data.events;
                this.code = '';
            })
            .catch(err => {
                this.error = true;
            })
            .then(() => {
                this.computing = false;
            });
        },
        removeCode: function(e, code) {
            this.computing = true;
            axios({
                method: 'PATCH',
                url: Flask.url_for('calendar.remove_code', {'code': code}),
            })
            .then(resp => {
                this.codes.splice(this.codes.indexOf(code), 1);
                this.calendarOptions.events = resp.data.events;
            })
            .catch(err => {
                this.error = true;
            })
            .then(() => {
                this.computing = false;
            });
        },
        addEvent: function(e) {
            let evt = {
                name: this.eventForm.name,
                location: this.eventForm.location,
                description: this.eventForm.description,
            }
            if (this.eventForm.recurring) {
                evt.begin = this.eventForm.beginRecurrDay + ' ' + this.eventForm.beginHour;
                evt.end = this.eventForm.beginRecurrDay + ' ' + this.eventForm.endHour;
                evt.end_recurr = this.eventForm.endRecurrDay + ' ' + this.eventForm.endHour;
                evt.freq = this.eventForm.freq;
            } else {
                evt.begin = this.eventForm.beginDay + ' ' + this.eventForm.beginHour;
                evt.end = this.eventForm.endDay + ' ' + this.eventForm.endHour;
            }

            computing = true;
            axios({
                method: 'POST',
                url: Flask.url_for('calendar.add_custom_event'),
                data: evt,
                header: {'Content-Type': 'application/json'},
            })
            .then(resp => {
                vm.events.push(resp.data.event);
                e.target.reset();
                addEventModal.hide();
            })
            .catch(err => {
                this.error = true;
            })
            .then(() => {
                computing = false;
            });
        },
        checkMinDay: function(e) {
            if (this.eventForm.beginDay > this.eventForm.endDay || !this.eventForm.endDay) {
                this.eventForm.endDay = this.eventForm.beginDay;
            }
        },
        checkMaxDay: function(e) {
            if (this.eventForm.beginDay > this.eventForm.endDay || !this.eventForm.beginDay) {
                this.eventForm.beginDay = this.eventForm.endDay;
            }
        },
        checkMinRecurrDay: function(e) {
            if (this.eventForm.beginRecurrDay > this.eventForm.endRecurrDay || !this.eventForm.endRecurrDay) {
                this.eventForm.endRecurrDay = this.eventForm.beginRecurrDay;
            }
        },
        checkMaxRecurrDay: function(e) {
            if (this.eventForm.beginRecurrDay > this.eventForm.endRecurrDay || !this.eventForm.beginRecurrDay) {
                this.eventForm.beginRecurrDay = this.eventForm.endRecurrDay;
            }
        },
        checkMinHour: function(e) {
            if (this.eventForm.beginHour > this.eventForm.endHour || !this.eventForm.endHour) {
                this.eventForm.endHour = this.eventForm.beginHour;
            }
        },
        checkMaxHour: function(e) {
            if (this.eventForm.beginHour > this.eventForm.endHour || !this.eventForm.beginHour) {
                this.eventForm.beginHour = this.eventForm.endHour;
            }
        },
        getDetails: function(code) {
            if (this.courseInfo.code === code) {
                courseModal.show();
            } else {
                this.computing = true;
                axios({
                    method: 'GET',
                    url: Flask.url_for('calendar.get_info', {'code': code}),
                })
                .then(resp => {
                    this.courseInfo.code = code;
                    this.courseInfo.title = code + ': ' + resp.data.title;
                    this.courseInfo.summary = resp.data.summary;

                    Object.entries(this.courseInfo.summary).forEach(([key, val]) => {
                        Vue.set(this.courseInfo.filtered, key, {});
                        Object.entries(val).forEach(([k, v]) => {
                            Vue.set(this.courseInfo.filtered[key], k, {});
                            v.forEach(item => {
                                Vue.set(this.courseInfo.filtered[key][k], item, !resp.data.filtered[key].includes(k + ': ' + item));
                            });
                        });
                    });

                    courseModal.show();
                })
                .catch(err => {
                    this.error = true;
                })
                .then(() => {
                    this.computing = false;
                });
            }
        },
        applyFilter: function(e) {
            this.computing = true;
            axios({
                method: 'PUT',
                url: Flask.url_for('calendar.apply_filter'),
                data: this.courseInfo.filtered,
                header: {'Content-Type': 'application/json'},
            })
            .then(resp => {
                this.calendarOptions.events = resp.data.events;
            })
            .catch(err => {
                this.error = true;
            })
            .then(() => {
                this.computing = false;
            });
        },
        toggleNav: function(show) {
            this.navBtn = show;
            if (show)   { codeMenu.show(); }
            else        { codeMenu.hide(); }
        },
        removeEvent: function(event) {
            this.computing = true;
            axios({
                method: 'DELETE',
                url: Flask.url_for('calendar.delete_custom_event', {'id': event.id}),
            })
            .then(resp => {
                event.remove();
            })
            .catch(err => {
                this.error = true;
            })
            .then(() => {
                this.computing = false;
            });
        },
    },
    computed: {
        calendarOpacity: function() {
            return {'opacity': this.computing ? '0.2':'1'}
        },
    },
    created:  function () {
        this.fetchData();
    },
});


document.addEventListener('DOMContentLoaded', function() {
    popoverList = [].slice.call(document.querySelectorAll('[data-toggle="popover"]')).map(function (popoverTriggerEl) {
        return new Popover(popoverTriggerEl, {
            container: 'body',
            trigger: 'focus',
        })
    });
    addEventModal = new Modal(document.getElementById('addEventModal'));
    eventModal = new Modal(document.getElementById('eventModal'));
    courseModal = new Modal(document.getElementById('courseModal'));
    codeMenu = new Collapse(document.getElementById('sidebarMenu'), {
        toggle: false,
    });
});
