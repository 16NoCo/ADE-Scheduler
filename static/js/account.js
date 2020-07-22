
var warningModal = {};
var vm = new Vue({
    el: '#app',
    data: {
        schedules: [],
        current_schedule: {},
        computing: true,
        unsaved: true,
        error: false,
        isEditing: false,
    },
    delimiters: ['[[',']]'],
    methods: {
        fetchData: function(e) {
            this.computing = true;
            axios({
                method: 'GET',
                url: Flask.url_for('account.get_data'),
            })
            .then(resp => {
                this.unsaved = resp.data.unsaved;
                this.schedules = resp.data.schedules;
                this.current_schedule = resp.data.current_schedule;
            })
            .catch(err => {
                this.error = true;
            })
            .then(() => {
                this.computing = false;
            });
        },
        loadSchedule: function(e, id) {
            this.request = function() {
                this.computing = true;
                axios({
                    method: 'GET',
                    url: Flask.url_for('account.load_schedule', {'id': id}),
                })
                .then(resp => {
                    this.unsaved = resp.data.unsaved;
                    this.current_schedule = resp.data.current_schedule;
                })
                .catch(err => {
                    this.error = true;
                })
                .then(() => {
                    this.computing = false;
                });
            }

            if (this.unsaved) {
                warningModal.show();
            } else {
                this.request();
            }
        },
        viewSchedule: function(e, id) {
            // ...
            this.request = function() {
                this.computing = true;
                axios({
                    method: 'GET',
                    url: Flask.url_for('account.load_schedule', {'id': id}),
                })
                .then(resp => {
                    window.location.href = Flask.url_for('calendar.schedule_viewer');
                })
                .catch(err => {
                    this.error = true;
                })
                .then(() => {
                    this.computing = false;
                });
            }

            if (this.unsaved) {
                warningModal.show();
            } else {
                this.request();
            }
        },
        deleteSchedule: function(e, id) {
            this.computing = true;
            axios({
                method: 'DELETE',
                url: Flask.url_for('account.delete_schedule', {'id': id}),
            })
            .then(resp => {
                this.schedules.splice(this.schedules.findIndex(s => s.id === id), 1);
                if (resp.data.no_current_schedule) {
                    this.current_schedule = resp.data.current_schedule;
                }
            })
            .catch(err => {
                this.error = true;
            })
            .then(() => {
                this.computing = false;
            });
        },
        updateLabel: function(e, id) {
            // ...
            if (this.isEditing) {
                this.computing = true;
                if (id == null) { id = -1; }
                axios({
                    method: 'PATCH',
                    url: Flask.url_for('account.update_label', {'id': id}),
                    header: {'Content-Type': 'applacation/json'},
                    data: {'label': this.current_schedule.label},
                })
                .then(resp => {
                    this.isEditing = false;
                    this.schedules.find(s => s.id === id).label = this.current_schedule.label;
                })
                .catch(err => {
                    this.error = true;
                })
                .then(() => {
                    this.computing = false;
                });
            } else {
                this.isEditing = true;
            }
        },
        warningContinue: function() {this.request()},
        request: function() {},
    },
    computed: {
        opacity: function() {
            return {'opacity': this.computing ? '0.2':'1'}
        },
    },
    created: function() {
        this.fetchData();
    },
});


document.addEventListener('DOMContentLoaded', function() {
    warningModal = new bootstrap.Modal(document.getElementById('warningModal'));
});
