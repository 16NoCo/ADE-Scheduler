import Vue from 'vue';
import { Icon, latLng } from 'leaflet';
import { LMap, LTileLayer, LMarker, LTooltip } from 'vue2-leaflet';
import { Modal } from 'bootstrap';
import FullCalendar from '@fullcalendar/vue'
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import frLocale from '@fullcalendar/core/locales/fr';
import './base.js';
import '../css/classroom.css';
import 'leaflet/dist/leaflet.css';
const axios = require('axios');


delete Icon.Default.prototype._getIconUrl;
Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});


document.addEventListener('DOMContentLoaded', function() {
    var isTouchDevice = !!('ontouchstart' in window || navigator.maxTouchPoints);
    var vm = new Vue({
        el: '#app',
        delimiters: ['[[',']]'],
        components: { LMap, LTileLayer, LMarker, LTooltip, FullCalendar },
        data: {
            computing: false,
            error: false,
            url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            center: latLng(50.6681, 4.6118),
            zoom: 15,
            attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
            classrooms: [],
            nameSearch: '',
            codeSearch: '',
            addressSearch: '',
            calendarOptions: {
                plugins: [ dayGridPlugin, timeGridPlugin ],
                locales: [ frLocale ],
                locale: document.getElementById('current-locale').innerText.trim(),

                height: 'auto',
                slotMinTime: '08:00:00',
                slotMaxTime: '21:00:00',
                editable: false,
                droppable: false,
                allDaySlot: false,
                navLinks: true,
                initialView: 'dayGridMonth',
                windowResize: function (arg) {
                    if (document.body.clientWidth > 550) {
                        vm.calendarOptions.headerToolbar.right = 'dayGridMonth,timeGridWeek';
                        vm.calendarOptions.headerToolbar.center = 'title';
                        if (arg.view.type === 'timeGridDay') { this.changeView('timeGridWeek') }
                    } else {
                        vm.calendarOptions.headerToolbar.right = 'dayGridMonth,timeGridDay';
                        vm.calendarOptions.headerToolbar.center = '';
                        if (arg.view.type === 'timeGridWeek') { this.changeView('timeGridDay') }
                    }
                },

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
                headerToolbar: {
                    left: 'prev,next today',
                    center: document.body.clientWidth > 550 ? 'title':'',
                    right: document.body.clientWidth > 550 ? 'dayGridMonth,timeGridWeek':'dayGridMonth,timeGridDay'
                },

                // Events
                events: [],
                eventTextColor: 'white',
                eventDisplay: 'block',
                eventDidMount: function (arg) {
                    let description, location;
                    if (!arg.event.extendedProps.description)   description = 'No description';
                    else                                        description = arg.event.extendedProps.description;
                    if (!arg.event.extendedProps.location)      location = 'No location';
                    else                                        location = arg.event.extendedProps.location;
                    new Tooltip(arg.el, {
                        container: 'body',
                        title: description + '\n' + location,
                        sanitize: false,
                        template: `
                            <div class="tooltip" role="tooltip">
                                <div class="tooltip-arrow"></div>
                                <div class="tooltip-inner" style="background-color:${arg.event.backgroundColor}"></div>
                            </div>`,
                        placement: 'auto',
                    });
                },
            },
            modalTitle: '',
        },

        methods: {
            fetchData: function() {
                this.computing = true;
                axios({
                    method: 'GET',
                    url: Flask.url_for('classroom.get_data'),
                })
                .then(resp => {
                    this.classrooms = resp.data.classrooms;
                })
                .catch(err => {
                    this.error = true;
                })
                .then(() => {
                    this.computing = false;
                });
            },
            getOccupation: function(name) {
                this.modalTitle = name;
                calendarModal.show();
                document.getElementById('calendarModal').addEventListener('shown.bs.modal', () => {
                    let api = this.$refs.calendar.getApi();
                    api.next();
                    api.prev();
                });
            }
        },
        computed: {
            opacity: function() {
                return {'opacity': this.computing ? '0.2':'1'}
            },
            classroomsFiltered: function () {
                return this.classrooms
                    .filter(c => !(c.name.toLowerCase().replace(/[^a-z0-9]/gi, '').indexOf(this.nameSearch.toLowerCase().replace(/[^a-z0-9]/gi, '')) === -1))
                    .filter(c => !(c.code.toLowerCase().replace(/[^a-z0-9]/gi, '').indexOf(this.codeSearch.toLowerCase().replace(/[^a-z0-9]/gi, '')) === -1))
                    .filter(c => !(c.address.toLowerCase().replace(/[^a-z0-9]/gi, '').indexOf(this.addressSearch.toLowerCase().replace(/[^a-z0-9]/gi, '')) === -1));
            },
            markers: function () {
                return this.classroomsFiltered.filter(item => item.latitude !== null && item.longitude !== null);
            },
        },
        created:  function () {
            this.fetchData();
        },
    });

    var calendarModal = new Modal(document.getElementById('calendarModal'));
});
