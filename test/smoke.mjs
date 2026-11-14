// Browser-free smoke test: mounts every page with a fake host (jsdom + the same Vue the platform uses).
// Usage: node test/smoke.mjs <path-to-a-folder-with-node_modules-containing-vue-and-jsdom>
import { createRequire } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = process.argv[2]
if (!root) throw new Error('pass a directory that has vue and jsdom in node_modules')
const req = createRequire(path.join(path.resolve(root), 'x.js'))
const { JSDOM } = req('jsdom')
const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>', { pretendToBeVisual: true, url: 'http://localhost/' })
for (const k of ['window', 'document', 'navigator', 'Node', 'Element', 'HTMLElement', 'SVGElement', 'Event']) {
  Object.defineProperty(globalThis, k, { value: k === 'window' ? dom.window : dom.window[k], configurable: true, writable: true })
}
const Vue = req('vue')
globalThis.__SB_HOST__ = { vue: Vue }

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d) }

const subjects = [{ id: '1', name: 'Mathematics', category: 'Exams', description: 'Algebra', program: 'P', topics: 'Fractions\nEquations', price: 1800, color: '#4f46e5' }]
const student = (id, name, status, extra = {}) => ({
  id: String(id), name, birth_date: null, grade: '9', school: null, phone: null, email: null, subject_id: 1, started_on: day(-60), format: 'online', price: 1800, duration: 60,
  goal: 'Pass the exam', level: null, desired_result: null, strengths: null, weaknesses: 'Fractions', focus_topics: null, wishes: null, notes: 'secret', status,
  lessons_done: 5, lessons_paid: 6, balance: 1800, debt: 0, next_lesson_date: day(1), next_lesson_time: '16:00:00', last_lesson_date: day(-3), ...extra,
})
const students = [student(1, 'Alice Brown', 'active'), student(2, 'Bob Green', 'active', { debt: 3600, balance: -3600 }), student(3, 'Old Student', 'archived')]
const lesson = (id, sid, offset, time, status, extra = {}) => ({ id: String(id), student_id: sid, subject_id: 1, series_id: null, lesson_date: day(offset), lesson_time: time, duration: 60, format: 'online', place: null, price: 1800, status, comment: null, moves: 0, ...extra })
const lessons = [lesson(1, 1, 0, '16:00:00', 'confirmed'), lesson(2, 2, 0, '18:00:00', 'planned'), lesson(3, 1, -3, '16:00:00', 'done'), lesson(4, 1, 1, '16:00:00', 'planned', { moves: 1 }), lesson(5, 2, 3, '12:00:00', 'planned')]
const settings = { work_days: '1,2,3,4,5,6', work_from: '09:00', work_to: '21:00', default_price: 1500, default_duration: 60, holidays: '', tutor_name: 'Maria' }
const entry = { id: '1', student_id: 1, lesson_id: 3, subject_id: 1, entry_date: day(-3), topic: 'Journal topic', material: null, exercises: null, results: null, difficulties: 'Signs', homework_text: null, comment: null, score: 4, links: null }
const hw = (id, status, due, topic) => ({ id: String(id), student_id: 1, subject_id: 1, lesson_id: null, topic, body: 'Do it', issued_on: day(-5), due_on: due, status, is_overdue: false, comment: null, links: null })
const homework = [hw(1, 'issued', day(-1), 'Overdue homework'), hw(2, 'submitted', day(2), 'Submitted homework'), hw(3, 'checked', day(-4), 'Checked homework')]
const payments = [{ id: '1', student_id: 1, paid_on: day(-10), amount: 10800, lessons_count: 6, note: 'Cash' }]
const review = [{ code: 'debt', severity: 'bad', student_id: 2, lesson_id: null, homework_id: null, meta: 'Bob Green|3600' }, { code: 'no_next', severity: 'info', student_id: 3, lesson_id: null, homework_id: null, meta: 'Old Student' }]

const makeHost = (user, { deny = false, empty = false } = {}) => ({
  locale: 'en', user,
  t: (k) => k,
  localePath: (p) => p,
  toast: () => {},
  gql: async (q) => {
    if (deny) throw new Error('Unauthorized')
    if (q.includes('tutorSubjects')) return { tutorSubjects: empty ? [] : subjects }
    if (q.includes('tutorStudents')) return { tutorStudents: empty ? [] : students }
    if (q.includes('tutorLessons(')) return { tutorLessons: empty ? [] : lessons }
    if (q.includes('tutorSettings')) return { tutorSettings: settings }
    if (q.includes('tutorGuardians')) return { tutorGuardians: [{ id: '1', student_id: 1, name: 'Mom Brown', relation: 'Mother', phone: '+1', email: null }] }
    if (q.includes('tutorEntries')) return { tutorEntries: [entry] }
    if (q.includes('tutorHomework(')) return { tutorHomework: homework }
    if (q.includes('tutorPayments')) return { tutorPayments: payments }
    if (q.includes('tutorReview')) return { tutorReview: review }
    if (q.includes('tutorConflicts')) return { tutorConflicts: [] }
    if (q.includes('tutorFreeSlots')) return { tutorFreeSlots: [{ date: day(1), time: '10:00' }] }
    if (q.includes('tutorHomeworkDraft')) return { tutorHomeworkDraft: { topic: 'Fractions', body: 'Draft body' } }
    if (q.includes('tutorProgressReport')) return { tutorProgressReport: { title: 'Report', body: 'Report body' } }
    if (q.includes('tutorLessonMoves')) return { tutorLessonMoves: [] }
    return {}
  },
})

const tick = () => new Promise(r => setTimeout(r, 40))
const base = pathToFileURL(path.resolve('web')).href
const { pages, widgets } = await import(`${base}/admin.mjs`)
const site = await import(`${base}/site.mjs`)

let failed = 0
async function render(name, comp, host, expect, after) {
  const warns = []
  const el = document.createElement('div')
  document.body.appendChild(el)
  const app = Vue.createApp(comp, { host })
  app.config.warnHandler = (m) => warns.push(m)
  app.config.errorHandler = (err) => { warns.push(String(err)) }
  app.mount(el)
  await tick(); await tick(); await tick()
  if (after) { await after(el); await tick(); await tick() }
  const text = document.body.textContent
  const ok = expect.every(s => text.includes(s)) && !warns.length
  if (!ok) { failed++; console.log('FAIL', name, warns.slice(0, 3), 'missing:', expect.filter(s => !text.includes(s)), text.slice(0, 200)) } else console.log('ok  ', name)
  app.unmount()
  document.body.innerHTML = ''
}
const click = (sel, text) => { const n = [...document.querySelectorAll(sel)].find(x => !text || x.textContent.includes(text)); n?.click() }

const owner = { id: 1 }
await render('home as guest', site.widgets.TutorHome, makeHost(null), ['landing_title', 'landing_cta', 'lesson_confirmed'])
await render('home as owner', site.widgets.TutorHome, makeHost(owner), ['kpi_today', 'Alice Brown', 'dash_upcoming'])
await render('overview', pages[''], makeHost(owner), ['kpi_students', 'review_debt', 'dash_today', 'Bob Green'])
await render('overview empty', pages[''], makeHost(owner, { empty: true }), ['empty_title', 'demo_button'])
await render('schedule week', pages.schedule, makeHost(owner), ['view_week', 'Alice Brown'])
await render('schedule list', pages.schedule, makeHost(owner), ['Alice Brown', 'Bob Green'], async () => click('.tu-seg button', 'view_list'))
await render('schedule month', pages.schedule, makeHost(owner), ['view_month'], async () => click('.tu-seg button', 'view_month'))
await render('lesson modal', pages.schedule, makeHost(owner), ['lesson_edit', 'lesson_status', 'lesson_reschedule'], async () => { click('.tu-seg button', 'view_list'); await tick(); click('.tu-item', 'Alice Brown') })
await render('new lesson', pages.schedule, makeHost(owner), ['lesson_new', 'f_repeat'], async () => click('button', 'lesson_new'))
await render('students', pages.students, makeHost(owner), ['Alice Brown', 'Bob Green', 'student_active', 'student_add'])
await render('student card', pages.students, makeHost(owner), ['tab_parents', 'tab_report', 'f_goal', 'f_notes'], async () => click('tr.click', 'Alice Brown'))
await render('student parents', pages.students, makeHost(owner), ['Mom Brown'], async () => { click('tr.click', 'Alice Brown'); await tick(); click('.tu-tabs button', 'tab_parents') })
await render('student journal', pages.students, makeHost(owner), ['Journal topic'], async () => { click('tr.click', 'Alice Brown'); await tick(); click('.tu-tabs button', 'tab_journal') })
await render('student payments', pages.students, makeHost(owner), ['pay_balance', 'Cash'], async () => { click('tr.click', 'Alice Brown'); await tick(); click('.tu-tabs button', 'tab_payments') })
await render('student report', pages.students, makeHost(owner), ['copy'], async () => { click('tr.click', 'Alice Brown'); await tick(); click('.tu-tabs button', 'tab_report'); await tick(); click('button', 'report_make') })
await render('journal', pages.journal, makeHost(owner), ['Journal topic', 'entry_new'])
await render('homework', pages.homework, makeHost(owner), ['Overdue homework', 'hwf_open'])
await render('payments', pages.payments, makeHost(owner), ['pay_kpi_debt', 'Bob Green'])
await render('settings', pages.settings, makeHost(owner), ['settings_hours', 'Mathematics', 'f_work_days'])
await render('agent', pages.agent, makeHost(owner), ['agent_review', 'review_debt', 'agent_draft', 'free_slots'])
await render('agent draft', pages.agent, makeHost(owner), ['copy', 'agent_to_hw'], async () => click('button', 'agent_make'))
await render('dashboard widget', widgets.TutorDashboard, makeHost(owner), ['app_name', 'mini_today'])
await render('denied', pages[''], makeHost(owner, { deny: true }), ['denied'])
process.exit(failed ? 1 : 0)
