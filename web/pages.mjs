// Overview, settings, assistant and the dashboard widget.
import {
  e, defineComponent, ref, reactive, computed, watch, onMounted, Modal, Q, makePage, useOffice, Field, bind, bindNum, Swatches, StudentSelect, LessonChip, Avatar,
  loc, todayStr, addDays, weekStart, dayTitle, money, fmt, hm, endTime, parts, weekdays, isoWeekday, SEVERITY_COLOR, UPCOMING, COLORS,
} from './core.mjs'
import { HomeworkModal } from './work.mjs'
import { useLessonLayer } from './lessons.mjs'
import { StudentModal } from './students.mjs'

const errText = (host, err) => String(err?.message || host.t('error'))

/** Formats "2026-11-12" or "2026-11-12 18:00" from a review meta part. */
const dateBit = (host, s) => (/^\d{4}-\d\d-\d\d/.test(s || '') ? dayTitle(host, s.slice(0, 10), false) + s.slice(10) : s)

/** Renders one assistant recommendation as { title, text }. */
export function reviewText(host, r) {
  const p = parts(r.meta)
  const vars = { name: p[0] ?? '', n: p[0] ?? '' }
  if (r.code === 'debt') vars.sum = money(host, Number(p[1] || 0))
  else if (r.code === 'hw_overdue') { vars.topic = p[1] ?? ''; vars.date = dateBit(host, p[2]) }
  else if (r.code === 'conflict') { vars.other = p[1] ?? ''; vars.date = dateBit(host, p[2]) }
  else if (r.code === 'low_score') vars.avg = p[1] ?? ''
  else vars.date = dateBit(host, p[1])
  return fmt(host.t('review_' + r.code), vars)
}

/** Recommendation list; click opens the lesson or the student. */
function ReviewList(host, office, items, onOpen, limit) {
  const list = limit ? items.slice(0, limit) : items
  if (!list.length) return e('div', { class: 'tu-hint' }, '✓ ' + host.t('review_none'))
  return list.map((r, i) => e('div', { class: 'tu-note click', key: i, style: `--cc:${SEVERITY_COLOR[r.severity] || '#64748b'}`, onClick: () => onOpen(r) },
    e('div', null, e('span', { style: 'color:var(--c-text)' }, reviewText(host, r)))))
}

function useReview(host, office) {
  const items = ref([])
  async function load() {
    try { items.value = (await host.gql(Q.review, { today: todayStr() })).tutorReview } catch { items.value = [] }
  }
  onMounted(load)
  watch(() => [office.lessons.value, office.students.value], load)
  return items
}

// ---------------------------------------------------------------- overview
export const Overview = makePage('nav_dashboard', ({ host, office }) => {
  const layer = useLessonLayer(host, office)
  const review = useReview(host, office)
  const studentModal = ref(null)
  const openStudent = id => { const s = office.studentById.value.get(Number(id)); if (s) studentModal.value = { s, key: Math.random() } }
  const onReview = r => {
    const l = r.lesson_id ? office.lessons.value.find(x => Number(x.id) === Number(r.lesson_id)) : null
    if (l) layer.open(l)
    else if (r.student_id) openStudent(r.student_id)
  }
  const setDone = l => office.run(Q.lessonStatus, { id: l.id, status: 'done' }, 'lesson_status')

  const row = (host, l, showDate) => {
    const s = office.studentById.value.get(Number(l.student_id))
    return e('div', { class: 'tu-item', key: l.id, onClick: () => layer.open(l) },
      e('span', { class: 'tu-dot', style: `background:${office.colorOf(l)}` }),
      e('div', { class: 'm' }, e('b', null, (showDate ? dayTitle(host, l.lesson_date, false) + ' · ' : '') + hm(l.lesson_time) + '–' + endTime(l.lesson_time, l.duration) + ' · ' + (s?.name || '?')),
        e('span', null, [office.subjectById.value.get(Number(l.subject_id))?.name, host.t('format_' + l.format)].filter(Boolean).join(' · '))),
      UPCOMING.includes(l.status) && l.lesson_date <= todayStr() ? e('button', { class: 'tu-btn sm', title: host.t('lesson_done'), onClick: ev => { ev.stopPropagation(); setDone(l) } }, '✓') : null,
      LessonChip(host, l.status))
  }

  return () => {
    const today = todayStr()
    const L = office.lessons.value
    const active = L.filter(l => l.status !== 'rescheduled')
    const todays = active.filter(l => l.lesson_date === today).sort((a, b) => a.lesson_time.localeCompare(b.lesson_time))
    const ws = weekStart(today)
    const weekCount = active.filter(l => l.lesson_date >= ws && l.lesson_date <= addDays(ws, 6) && !String(l.status).startsWith('cancelled')).length
    const upcoming = active.filter(l => l.lesson_date > today && l.lesson_date <= addDays(today, 7) && UPCOMING.includes(l.status)).sort((a, b) => (a.lesson_date + a.lesson_time).localeCompare(b.lesson_date + b.lesson_time))
    const students = office.students.value
    const debtors = students.filter(s => s.debt > 0)
    const debt = debtors.reduce((a, s) => a + Number(s.debt || 0), 0)
    const monthStart = today.slice(0, 7) + '-01'
    const earned = active.filter(l => l.status === 'done' && l.lesson_date >= monthStart).reduce((a, l) => a + Number(l.price || 0), 0)
    const name = office.settings.value.tutor_name

    return {
      actions: e('button', { class: 'tu-btn primary', onClick: () => layer.open(null, { lesson_date: today }) }, '+ ' + host.t('lesson_new')),
      sub: name ? fmt(host.t('dash_hello'), { name }) : host.t('dash_sub'),
      always: false,
      content: e('div', { class: 'tu-grid' },
        e('div', { class: 'tu-grid tu-g4' },
          e('div', { class: 'tu-card tu-kpi' }, e('div', { class: 'k' }, host.t('kpi_today')), e('div', { class: 'v' }, todays.filter(l => !String(l.status).startsWith('cancelled')).length), e('div', { class: 'd' }, fmt(host.t('kpi_week'), { n: weekCount }))),
          e('div', { class: 'tu-card tu-kpi' }, e('div', { class: 'k' }, host.t('kpi_students')), e('div', { class: 'v' }, students.filter(s => s.status === 'active').length), e('div', { class: 'd' }, fmt(host.t('kpi_students_all'), { n: students.length }))),
          e('div', { class: 'tu-card tu-kpi' }, e('div', { class: 'k' }, host.t('kpi_earned')), e('div', { class: 'v' }, money(host, earned)), e('div', { class: 'd' }, host.t('pay_earned_note'))),
          e('div', { class: 'tu-card tu-kpi' }, e('div', { class: 'k' }, host.t('pay_kpi_debt')), e('div', { class: 'v tu-money ' + (debt > 0 ? 'bad' : 'ok') }, debt > 0 ? money(host, debt) : '0'), e('div', { class: 'd' }, debt > 0 ? fmt(host.t('pay_kpi_debtors'), { n: debtors.length }) : host.t('pay_kpi_none')))),
        e('div', { class: 'tu-grid tu-main' },
          e('div', { class: 'tu-grid' },
            e('div', { class: 'tu-card' }, e('h2', null, host.t('dash_today'), e('small', null, dayTitle(host, today))),
              todays.length ? e('div', { class: 'tu-list' }, todays.map(l => row(host, l, false))) : e('div', { class: 'tu-hint' }, host.t('dash_today_empty'))),
            e('div', { class: 'tu-card' }, e('h2', null, host.t('dash_upcoming')),
              upcoming.length ? e('div', { class: 'tu-list' }, upcoming.slice(0, 8).map(l => row(host, l, true))) : e('div', { class: 'tu-hint' }, host.t('dash_upcoming_empty')))),
          e('div', { class: 'tu-card' }, e('h2', null, '✨ ' + host.t('nav_agent'), e('small', null, review.value.length ? String(review.value.length) : '')), ReviewList(host, office, review.value, onReview, 7)))),
      modal: e('div', null, layer.view(), studentModal.value ? e(StudentModal, { key: studentModal.value.key, host, office, student: studentModal.value.s, onClose: () => { studentModal.value = null } }) : null),
    }
  }
})

// ---------------------------------------------------------------- dashboard widget (admin home)
export const MiniDashboard = defineComponent({
  name: 'TuMiniDashboard',
  props: { host: { type: Object, required: true } },
  setup(props) {
    const { host } = props
    const office = useOffice(host)
    return () => {
      if (office.loading.value || office.denied.value) return null
      const today = todayStr()
      const todays = office.lessons.value.filter(l => l.lesson_date === today && UPCOMING.includes(l.status))
      const next = office.lessons.value.filter(l => (l.lesson_date + l.lesson_time) >= (today + '00:00') && UPCOMING.includes(l.status)).sort((a, b) => (a.lesson_date + a.lesson_time).localeCompare(b.lesson_date + b.lesson_time))[0]
      const debt = office.students.value.reduce((a, s) => a + Number(s.debt || 0), 0)
      return e('div', { class: 'tu' }, e('div', { class: 'tu-card tu-mini' },
        e('h2', null, '🎓 ' + host.t('app_name'), e('a', { href: host.localePath('/admin/x/rumantic.tutor/schedule'), class: 'tu-hint' }, host.t('nav_schedule') + ' →')),
        e('div', { class: 'big' }, fmt(host.t('mini_today'), { n: todays.length })),
        next ? e('div', { class: 'tu-hint' }, host.t('mini_next') + ': ' + dayTitle(host, next.lesson_date, false) + ' ' + hm(next.lesson_time) + ' · ' + office.nameOf(next.student_id)) : null,
        debt > 0 ? e('div', { class: 'tu-money bad' }, host.t('pay_kpi_debt') + ': ' + money(host, debt)) : null))
    }
  },
})

// ---------------------------------------------------------------- settings
const SubjectModal = defineComponent({
  name: 'TuSubjectModal',
  props: { host: Object, office: Object, subject: Object, onClose: Function },
  setup(props) {
    const { host, office } = props
    const s = props.subject || {}
    const f = reactive({ name: s.name ?? '', category: s.category ?? '', description: s.description ?? '', program: s.program ?? '', topics: s.topics ?? '', price: s.price ?? office.settings.value.default_price ?? null, color: s.color ?? COLORS[office.subjects.value.length % COLORS.length] })
    async function save() {
      if (!f.name.trim()) return host.toast(host.t('subject_need_name'), 'error')
      if (await office.run(Q.saveSubject, { id: props.subject?.id || null, input: { ...f, price: f.price == null ? null : Number(f.price) } })) props.onClose()
    }
    async function remove() {
      if (!globalThis.confirm(host.t('confirm_delete_subject'))) return
      if (await office.run(Q.delSubject, { id: props.subject.id }, 'deleted')) props.onClose()
    }
    return () => e(Modal, { title: host.t(props.subject ? 'subject_edit' : 'subject_new'), onClose: props.onClose },
      e('div', { class: 'tu-form' },
        e('div', { class: 'tu-two' }, Field(host.t('f_name'), e('input', { class: 'tu-input', ...bind(f, 'name') })), Field(host.t('f_category'), e('input', { class: 'tu-input', placeholder: host.t('f_category_ph'), ...bind(f, 'category') }))),
        Field(host.t('f_price'), e('input', { class: 'tu-input', type: 'number', min: 0, step: 'any', ...bindNum(f, 'price') })),
        Field(host.t('f_description'), e('textarea', { class: 'tu-area', style: 'min-height:60px', ...bind(f, 'description') })),
        Field(host.t('f_program'), e('textarea', { class: 'tu-area', style: 'min-height:90px', ...bind(f, 'program') })),
        Field(host.t('f_topics'), e('textarea', { class: 'tu-area', style: 'min-height:90px', placeholder: host.t('f_topics_ph'), ...bind(f, 'topics') })),
        e('div', { class: 'tu-hint' }, host.t('f_topics_hint')),
        e('div', { class: 'tu-label' }, host.t('f_color'), Swatches(f.color, c => { f.color = c })),
        e('div', { class: 'tu-row' }, e('button', { class: 'tu-btn primary', onClick: save }, host.t('save')), e('button', { class: 'tu-btn', onClick: props.onClose }, host.t('cancel')), e('span', { class: 'tu-grow' }),
          props.subject ? e('button', { class: 'tu-btn danger', onClick: remove }, host.t('delete')) : null)))
  },
})

export const SettingsPage = makePage('nav_settings', ({ host, office }) => {
  const modal = ref(null)
  const cfg = reactive({ work_days: '', work_from: '09:00', work_to: '21:00', default_price: 0, default_duration: 60, holidays: '', tutor_name: '' })
  const loaded = ref(false)
  const sync = () => { if (!loaded.value && !office.loading.value) { Object.assign(cfg, office.settings.value); loaded.value = true } }
  const days = computed(() => new Set(String(cfg.work_days || '').split(',').filter(Boolean).map(Number)))
  const toggleDay = n => { const set = new Set(days.value); set.has(n) ? set.delete(n) : set.add(n); cfg.work_days = [...set].sort().join(',') }
  const open = subject => { modal.value = { subject: subject || null, key: Math.random() } }

  async function saveCfg() {
    if (!cfg.work_days) return host.toast(host.t('settings_need_days'), 'error')
    await office.run(Q.saveSettings, { input: { work_days: cfg.work_days, work_from: cfg.work_from, work_to: cfg.work_to, default_price: Number(cfg.default_price) || 0, default_duration: Number(cfg.default_duration) || 60, holidays: cfg.holidays || '', tutor_name: cfg.tutor_name || '' } })
  }

  return () => {
    sync()
    const wd = weekdays(host)
    return {
      always: true,
      sub: host.t('settings_sub'),
      actions: e('button', { class: 'tu-btn primary', onClick: () => open(null) }, '+ ' + host.t('subject_new')),
      content: e('div', { class: 'tu-grid' },
        e('div', { class: 'tu-card' }, e('h2', null, host.t('settings_hours')),
          e('div', { class: 'tu-form' },
            e('div', { class: 'tu-label' }, host.t('f_work_days'), e('div', { class: 'tu-pick' }, wd.map((d, i) => e('label', { key: i, class: days.value.has(i + 1) ? 'on' : '', onClick: ev => { ev.preventDefault(); toggleDay(i + 1) } }, d)))),
            e('div', { class: 'tu-three' },
              Field(host.t('f_work_from'), e('input', { class: 'tu-input', type: 'time', ...bind(cfg, 'work_from') })),
              Field(host.t('f_work_to'), e('input', { class: 'tu-input', type: 'time', ...bind(cfg, 'work_to') })),
              Field(host.t('f_tutor_name'), e('input', { class: 'tu-input', ...bind(cfg, 'tutor_name') }))),
            e('div', { class: 'tu-two' },
              Field(host.t('f_default_price'), e('input', { class: 'tu-input', type: 'number', min: 0, step: 'any', ...bindNum(cfg, 'default_price') })),
              Field(host.t('f_default_duration'), e('input', { class: 'tu-input', type: 'number', min: 5, step: 5, ...bindNum(cfg, 'default_duration') }))),
            Field(host.t('f_holidays'), e('textarea', { class: 'tu-area', style: 'min-height:80px', placeholder: host.t('f_holidays_ph'), ...bind(cfg, 'holidays') })),
            e('div', { class: 'tu-hint' }, host.t('f_holidays_hint')),
            e('div', { class: 'tu-row' }, e('button', { class: 'tu-btn primary', onClick: saveCfg }, host.t('save'))))),
        e('div', { class: 'tu-card' }, e('h2', null, host.t('settings_subjects')),
          office.subjects.value.length
            ? e('div', { class: 'tu-tiles' }, office.subjects.value.map(s => e('div', { class: 'tu-card tu-tile', key: s.id, style: 'padding:14px 16px' },
              e('div', { class: 'top' }, e('span', { class: 'tu-dot', style: `background:${s.color || '#6366f1'}` }), e('b', null, s.name), s.price ? e('span', { class: 'tu-hint' }, money(host, s.price)) : null),
              s.category ? e('span', { class: 'tu-hint' }, s.category) : null,
              s.description ? e('p', null, s.description) : null,
              e('div', { class: 'act' }, e('button', { class: 'tu-btn sm', onClick: () => open(s) }, host.t('edit'))))))
            : e('div', { class: 'tu-hint' }, host.t('subjects_empty')))),
      modal: modal.value ? e(SubjectModal, { key: modal.value.key, host, office, subject: modal.value.subject, onClose: () => { modal.value = null } }) : null,
    }
  }
})

// ---------------------------------------------------------------- assistant
export const AgentPage = makePage('nav_agent', ({ host, office }) => {
  const review = useReview(host, office)
  const layer = useLessonLayer(host, office)
  const studentModal = ref(null)
  const hwModal = ref(null)
  const g = reactive({ student_id: null, topic: '', count: 6, body: '', draftTopic: '' })
  const sl = reactive({ date: todayStr(), duration: 60, days: 7, list: null })

  const openStudent = id => { const s = office.studentById.value.get(Number(id)); if (s) studentModal.value = { s, key: Math.random() } }
  const onReview = r => {
    const l = r.lesson_id ? office.lessons.value.find(x => Number(x.id) === Number(r.lesson_id)) : null
    if (l) layer.open(l)
    else if (r.student_id) openStudent(r.student_id)
  }
  async function makeDraft() {
    if (!g.student_id) return host.toast(host.t('lesson_need_student'), 'error')
    try {
      const r = (await host.gql(Q.draft, { student_id: Number(g.student_id), topic: g.topic || null, count: Number(g.count) || 6, locale: loc(host).slice(0, 2) })).tutorHomeworkDraft
      g.body = r.body; g.draftTopic = r.topic
    } catch (err) { host.toast(errText(host, err), 'error') }
  }
  async function copy() {
    try { await globalThis.navigator.clipboard.writeText(g.body); host.toast(host.t('copied'), 'success') } catch { host.toast(host.t('copy_failed'), 'error') }
  }
  async function findSlots() {
    try { sl.list = (await host.gql(Q.slots, { date: sl.date, duration: Number(sl.duration) || 60, days: Number(sl.days) || 7 })).tutorFreeSlots } catch (err) { host.toast(errText(host, err), 'error') }
  }

  return () => {
    if (g.student_id == null && office.students.value.length) g.student_id = Number(office.students.value.find(s => s.status === 'active')?.id ?? office.students.value[0].id)
    const grouped = {}
    for (const s of sl.list || []) (grouped[s.date] ||= []).push(s.time)
    return {
      sub: host.t('agent_sub'),
      content: e('div', { class: 'tu-grid tu-main' },
        e('div', { class: 'tu-card' }, e('h2', null, '🔎 ' + host.t('agent_review'), e('small', null, String(review.value.length))), ReviewList(host, office, review.value, onReview), e('div', { class: 'tu-hint', style: 'margin-top:10px' }, host.t('agent_rules_note'))),
        e('div', { class: 'tu-grid' },
          e('div', { class: 'tu-card' }, e('h2', null, '📝 ' + host.t('agent_draft')),
            e('div', { class: 'tu-form' },
              e('div', { class: 'tu-hint' }, host.t('agent_draft_hint')),
              e('div', { class: 'tu-two' }, Field(host.t('f_student'), StudentSelect(host, office, g, 'student_id')), Field(host.t('f_lessons_count'), e('input', { class: 'tu-input', type: 'number', min: 1, max: 20, ...bindNum(g, 'count') }))),
              Field(host.t('f_topic'), e('input', { class: 'tu-input', placeholder: host.t('agent_topic_ph'), ...bind(g, 'topic') })),
              e('div', { class: 'tu-row' }, e('button', { class: 'tu-btn primary sm', onClick: makeDraft }, '✨ ' + host.t('agent_make')),
                g.body ? e('button', { class: 'tu-btn sm', onClick: copy }, '📋 ' + host.t('copy')) : null,
                g.body ? e('button', { class: 'tu-btn sm', onClick: () => { hwModal.value = { key: Math.random() } } }, '→ ' + host.t('agent_to_hw')) : null),
              g.body ? e('textarea', { class: 'tu-area', style: 'min-height:200px', value: g.body, onInput: ev => { g.body = ev.target.value } }) : null)),
          e('div', { class: 'tu-card' }, e('h2', null, '🕒 ' + host.t('free_slots')),
            e('div', { class: 'tu-form' },
              e('div', { class: 'tu-three' }, Field(host.t('f_from'), e('input', { class: 'tu-input', type: 'date', ...bind(sl, 'date') })), Field(host.t('f_duration'), e('input', { class: 'tu-input', type: 'number', min: 15, step: 15, ...bindNum(sl, 'duration') })), Field(host.t('agent_days'), e('input', { class: 'tu-input', type: 'number', min: 1, max: 30, ...bindNum(sl, 'days') }))),
              e('div', { class: 'tu-row' }, e('button', { class: 'tu-btn primary sm', onClick: findSlots }, host.t('agent_find'))),
              sl.list ? (Object.keys(grouped).length ? Object.entries(grouped).map(([d, times]) => e('div', { key: d }, e('div', { class: 'tu-day' }, dayTitle(host, d)),
                e('div', { class: 'tu-pick' }, times.slice(0, 14).map(t => e('label', { key: t, onClick: ev => { ev.preventDefault(); layer.open(null, { lesson_date: d, lesson_time: t, duration: Number(sl.duration) || 60 }) } }, t))))) : e('div', { class: 'tu-hint' }, host.t('no_free_slots'))) : null)))),
      modal: e('div', null, layer.view(),
        studentModal.value ? e(StudentModal, { key: studentModal.value.key, host, office, student: studentModal.value.s, onClose: () => { studentModal.value = null } }) : null,
        hwModal.value ? e(HomeworkModal, { key: hwModal.value.key, host, office, hw: null, defaults: { student_id: g.student_id, topic: g.draftTopic, body: g.body }, onClose: () => { hwModal.value = null } }) : null),
    }
  }
})
