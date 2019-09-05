from app_calendar import *
from flask import Flask, request, url_for, render_template, redirect, make_response
from flask_babel import Babel, _
from flask_session import Session
***REMOVED***
import personnal_data

import library
import encrypt
import database

app = Flask(__name__)

# BABEL
app.config['LANGUAGES'] = ['en', 'fr']
app.config['BABEL_TRANSLATION_DIRECTORIES'] = 'app/translations'
babel = Babel(app)

app.secret_key = b'_5#y2L"F4Q8z\n\xec]/'
app.config['SESSION_TYPE'] = 'redis'
app.config['SESSION_REDIS'] = Redis(host=personnal_data.redis_ip, port=6379)
app.config['PERMANENT_SESSION_LIFETIME'] = 60*60*24
Session(app)


@babel.localeselector
def get_locale():
    if session.get('basic_context').get('locale') is None:
        session['basic_context']['locale'] = request.accept_languages.best_match(app.config['LANGUAGES'])
    locale = session['basic_context']['locale']
    return locale


@app.route('/locale/<locale>', methods=['GET'])
def locale_selector(locale):
    if request.method == 'GET':
        session['basic_context']['locale'] = locale
    return redirect(url_for('calendar'))


@app.route('/', methods=['GET', 'POST'])
def calendar():
    if not session.get('init'):
        init()

    if request.method == 'POST':
        # ADD CODE
        if request.form['submit'] == 'Add':
            code = request.form['course_code'].upper()
            add_courses(code)
        
        # SAVE PREFERENCES
        if request.form['submit'] == 'Settings':
            if request.form.getlist('safe-compute'):
                session['basic_context']['safe_compute'] = True
            else:
                session['basic_context']['safe_compute'] = False
            session['basic_context']['projectID'] = int(request.form['projectid-select'])
            fetch_courses()
            for code in session['codes']:
                session['basic_context']['priority'][code] = int(request.form.get('range-' + code))

    session['basic_context']['codes'] = session['codes']
    return render_template('calendar.html', **(session['basic_context']), data_base=json.dumps(session['data_base']),
                           data_sched=session['data_sched'], fts=json.dumps(session['fts']), id=session['id_tab'])


# To compute the schedules
@app.route('/compute', methods=['POST'])
def compute_schedules():
    session['id_list'] = json.loads(request.form['IDs'])
    get_id()
    compute()
    return redirect(url_for('calendar'))


# To clear the data
@app.route('/clear', methods=['POST'])
def clear_all():
    clear()
    return redirect(url_for('calendar'))


# To fetch the FTS
@app.route('/get/fts', methods=['POST'])
def getFTS():
    get_fts()
    return redirect(url_for('calendar'))


# To remove the code
@app.route('/remove/code/<code>', methods=['POST'])
def remove_code(code):
    delete_course(code)
    return redirect(url_for('calendar'))


# To fetch the IDs
@app.route('/get/id', methods=['POST'])
def getIDs():
    session['id_list'] = json.loads(request.form['IDs'])
    get_id()
    return redirect(url_for('calendar'))


# To download the calendar's .ics file
@app.route('/download/schedule/<choice>', methods=['POST'])
def download(choice):
    _cal = download_calendar(int(choice)-1)
    resp = make_response(_cal)
    resp.mimetype = 'text/calendar'
    resp.headers["Content-Disposition"] = "attachment; filename=calendar.ics"
    return resp


# To get the calendar's ics file via the subscription link [GET]
# OR to get generate a subscription link [POST]
@app.route('/getcalendar/<link>', methods=['GET', 'POST'])
def getCalendar(link):
    if request.method == 'POST':
        if link == 'secure_link':
            # SECURE & MODIFIABLE URL
            username = request.form['login']
            if database.isUsernamePresent(username):
                return _('This username already exists. Please choose another one.'), 400
            link = encrypt.generate_link(username, request.form['password'])
            library.saveSettings(link, session, choice=int(request.form['param']) - 1, username=username)
            return link
        else:
            # RANDOM URL
            library.saveSettings(link, session, choice=int(request.form['param'])-1)
            return link

    if request.method == 'GET':
        # CALENDAR REQUESTED (fetch the infos relative to this subscription link
        _cal = library.getCalendarFromLink(link)
        if _cal:
            resp = make_response(_cal)
            resp.mimetype = 'text/calendar'
            resp.headers["Content-Disposition"] = "attachment; filename=calendar.ics"
            return resp
        else:
            return _('The link you specified doesn\'t exist in our database !'), 400


# To get the user's settings
@app.route('/getsettings', methods=['POST'])
def getSettings():
    req = request.form['reqType']
    user = request.form['login']
    pwd = request.form['password']
    link = database.getLinkFromUsername(user)
    if not link: return _('Wrong credentials. Please try again.'), 400
    if req == 'load':
        # LOAD SETTINGS
        if encrypt.check_id(user, pwd, link):
            user_session = database.getSettingsFromLink(link)
            session['codes'] = user_session['codes']
            session['fts'] = user_session['fts']
            session['id_list'] = user_session['id_list']
            session['basic_context']['projectID'] = user_session['projectID']
            session['basic_context']['priority'] = user_session['priority']
            fetch_courses()
            compute()
            return redirect(url_for('calendar'))
        else:
            return _('Wrong credentials. Please try again.'), 400
    elif req == 'save':
        # UPDATE SETTINGS
        if encrypt.check_id(user, pwd, link):
            choice = request.form['choice']
            if choice == 'no-change':
                library.updateSettings(link, session)
            else:
                library.updateSettings(link, session, int(choice) - 1)
            return redirect(url_for('calendar'))
        else:
            return _('Wrong credentials. Please try again.'), 400
    elif req == 'forgot':
        if encrypt.check_id(user, pwd, link):
            return link
        else:
            return _('Wrong credentials. Please try again.'), 400
    else:
        return 400


# Page for user's help guide
@app.route('/help')
def help_guide():
    return render_template('help.html', **session['basic_context'])


# ERROR HANDLER
@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html', **session['basic_context']), 404


if __name__ == '__main__':
    host = personnal_data.local_ip
    app.run(debug=True, host=host)
