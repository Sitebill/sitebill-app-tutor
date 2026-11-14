// Students: the list and the student card (profile, parents, lessons, journal, homework, payments, report).
import {
  e, defineComponent, ref, reactive, computed, watch, onMounted, Modal, Q, makePage, Field, bind, bindNum, SubjectSelect, StudentChip, LessonChip, HwChip, Avatar,
  loc, todayStr, addDays, dayTitle, money, fmt, hm, hwShown, STUDENT_STATUSES, UPCOMING,
} from './core.mjs'
import { EntryModal, HomeworkModal, PaymentModal } from './work.mjs'
import { useLessonLayer } from './lessons.mjs'

const errText = (host, err) => String(err?.message || host.t('error'))
const TABS = ['profile', 'parents', 'lessons', 'journal', 'homework', 'payments', 'report']
const stars = n => (n ? '★'.repeat(n) + '☆'.repeat(5 - n) : '')

export const StudentModal = defineComponent({
  name: 'TuStudentModal',
  props: { host: Object, office: Object, student: Object, onClose: Function },
  setup(props) {
    const { host, office } = props
    const s0 = props.student || {}
    const cfg = office.settings.value
    const f = reactive({
      name: s0.name ?? '', birth_date: s0.birth_date ?? '', grade: s0.grade ?? '', school: s0.school ?? '', phone: s0.phone ?? '', email: s0.email ?? '',
      subject_id: s0.subject_id ?? null, started_on: s0.started_on ?? todayStr(), format: s0.format ?? 'online', price: s0.price ?? cfg.default_price ?? null, duration: s0.duration ?? cfg.default_duration ?? 60,
      goal: s0.goal ?? '', level: s0.level ?? '', desired_result: s0.desired_result ?? '', strengths: s0.strengths ?? '', weaknesses: s0.weaknesses ?? '', focus_topics: s0.focus_topics ?? '',
      wishes: s0.wishes ?? '', notes: s0.notes ?? '', status: s0.status ?? 'new',
    })
    const id = ref(props.student?.id || null)
    const tab = ref('profile')
    const busy = ref(false)
    const data = reactive({ guardians: [], entries: [], homework: [], payments: [], report: null })
    const g = reactive({ id: null, name: '', relation: '', phone: '', email: '' })
    const rp = reactive({ from: addDays(todayStr(), -30), to: todayStr(), with_money: false })
    const sub = ref(null)
    const layer = useLessonLayer(host, office)
    const fresh = () => office.studentById.value.get(Number(id.value)) || s0

    async function loadTab(name = tab.value) {
      if (!id.value) return
      const sid = Number(id.value)
      try {
        if (name === 'parents') data.guardians = (await host.gql(Q.guardians, { student_id: sid })).tutorGuardians
        if (name === 'journal') data.entries = (await host.gql(Q.entries, { student_id: sid })).tutorEntries
        if (name === 'homework') data.homework = (await host.gql(Q.homework, { student_id: sid, today: todayStr() })).tutorHomework
        if (name === 'payments') data.payments = (await host.gql(Q.payments, { student_id: sid })).tutorPayments
      } catch (err) { host.toast(errText(host, err), 'error') }
    }
    watch(tab, name => loadTab(name))

    async function save() {
      if (!f.name.trim()) return host.toast(host.t('student_need_name'), 'error')
      busy.value = true
      const input = { ...f, subject_id: f.subject_id || null, birth_date: f.birth_date || null, started_on: f.started_on || null, price: f.price == null ? null : Number(f.price), duration: Number(f.duration) || null }
      const r = await office.run(Q.saveStudent, { id: id.value, input })
      busy.value = false
      if (r) { id.value = r.tutorSaveStudent.id; if (!props.student) host.toast(host.t('student_created_hint'), 'success') }
    }
    async function remove() {
      if (!globalThis.confirm(host.t('confirm_delete_student'))) return
      if (await office.run(Q.delStudent, { id: id.value }, 'deleted')) props.onClose()
    }
    async function saveGuardian() {
      if (!g.name.trim()) return
      const ok = await office.run(Q.saveGuardian, { id: g.id, input: { student_id: Number(id.value), name: g.name, relation: g.relation || null, phone: g.phone || null, email: g.email || null } })
      if (ok) { Object.assign(g, { id: null, name: '', relation: '', phone: '', email: '' }); await loadTab('parents') }
    }
    async function delGuardian(x) {
      if (await office.run(Q.delGuardian, { id: x.id }, 'deleted')) await loadTab('parents')
    }
    async function makeReport() {
      try { data.report = (await host.gql(Q.report, { student_id: Number(id.value), from: rp.from || null, to: rp.to || null, with_money: rp.with_money, locale: loc(host).slice(0, 2) })).tutorProgressReport } catch (err) { host.toast(errText(host, err), 'error') }
    }
    async function copyReport() {
      try { await globalThis.navigator.clipboard.writeText(data.report.body); host.toast(host.t('copied'), 'success') } catch { host.toast(host.t('copy_failed'), 'error') }
    }
    const subClose = () => { sub.value = null; loadTab() }
    const subOpen = (kind, item) => { sub.value = { kind, item: item || null, key: Math.random() } }

    const form = () => e('div', { class: 'tu-form' },
      e('div', { class: 'tu-two' },
        Field(host.t('f_name'), e('input', { class: 'tu-input', ...bind(f, 'name') })),
        Field(host.t('f_status'), e('select', { class: 'tu-select', value: f.status, onChange: ev => { f.status = ev.target.value } }, STUDENT_STATUSES.map(s => e('option', { key: s, value: s }, host.t('student_' + s)))))),
      e('div', { class: 'tu-three' },
        Field(host.t('f_birth'), e('input', { class: 'tu-input', type: 'date', ...bind(f, 'birth_date') })),
        Field(host.t('f_grade'), e('input', { class: 'tu-input', ...bind(f, 'grade') })),
        Field(host.t('f_school'), e('input', { class: 'tu-input', ...bind(f, 'school') }))),
      e('div', { class: 'tu-three' },
        Field(host.t('f_phone'), e('input', { class: 'tu-input', ...bind(f, 'phone') })),
        Field(host.t('f_email'), e('input', { class: 'tu-input', type: 'email', ...bind(f, 'email') })),
        Field(host.t('f_started'), e('input', { class: 'tu-input', type: 'date', ...bind(f, 'started_on') }))),
      e('div', { class: 'tu-three' },
        Field(host.t('f_subject'), SubjectSelect(host, office, f, 'subject_id', { onPick: sid => { const sj = office.subjectById.value.get(Number(sid)); if (sj?.price && !props.student) f.price = sj.price } })),
        Field(host.t('f_format'), e('select', { class: 'tu-select', value: f.format, onChange: ev => { f.format = ev.target.value } }, ['online', 'offline'].map(k => e('option', { key: k, value: k }, host.t('format_' + k))))),
        e('div', { class: 'tu-two' },
          Field(host.t('f_price'), e('input', { class: 'tu-input', type: 'number', min: 0, step: 'any', ...bindNum(f, 'price') })),
          Field(host.t('f_duration'), e('input', { class: 'tu-input', type: 'number', min: 5, step: 5, ...bindNum(f, 'duration') })))),
      e('h3', { style: 'margin-top:6px' }, host.t('sec_learning')),
      e('div', { class: 'tu-two' },
        Field(host.t('f_goal'), e('textarea', { class: 'tu-area', style: 'min-height:70px', ...bind(f, 'goal') })),
        Field(host.t('f_level'), e('textarea', { class: 'tu-area', style: 'min-height:70px', ...bind(f, 'level') }))),
      e('div', { class: 'tu-two' },
        Field(host.t('f_desired'), e('textarea', { class: 'tu-area', style: 'min-height:70px', ...bind(f, 'desired_result') })),
        Field(host.t('f_wishes'), e('textarea', { class: 'tu-area', style: 'min-height:70px', ...bind(f, 'wishes') }))),
      e('div', { class: 'tu-two' },
        Field(host.t('f_strengths'), e('textarea', { class: 'tu-area', style: 'min-height:70px', ...bind(f, 'strengths') })),
        Field(host.t('f_weaknesses'), e('textarea', { class: 'tu-area', style: 'min-height:70px', ...bind(f, 'weaknesses') }))),
      Field(host.t('f_focus'), e('textarea', { class: 'tu-area', style: 'min-height:70px', placeholder: host.t('f_focus_ph'), ...bind(f, 'focus_topics') })),
      Field('🔒 ' + host.t('f_notes'), e('textarea', { class: 'tu-area', style: 'min-height:70px', ...bind(f, 'notes') })),
      e('div', { class: 'tu-hint' }, host.t('f_notes_hint')),
      e('div', { class: 'tu-row' },
        e('button', { class: 'tu-btn primary', disabled: busy.value, onClick: save }, host.t('save')),
        e('button', { class: 'tu-btn', onClick: props.onClose }, host.t('close')),
        e('span', { class: 'tu-grow' }),
        id.value ? e('button', { class: 'tu-btn danger', onClick: remove }, host.t('delete')) : null))

    const parentsTab = () => e('div', { class: 'tu-form' },
      data.guardians.length ? e('div', { class: 'tu-list' }, data.guardians.map(x => e('div', { class: 'tu-item', key: x.id, onClick: () => Object.assign(g, { id: x.id, name: x.name, relation: x.relation || '', phone: x.phone || '', email: x.email || '' }) },
        Avatar(x.name, '#8b5cf6'), e('div', { class: 'm' }, e('b', null, x.name), e('span', null, [x.relation, x.phone, x.email].filter(Boolean).join(' · '))),
        e('button', { class: 'tu-btn sm danger', onClick: ev => { ev.stopPropagation(); delGuardian(x) } }, '✕')))) : e('div', { class: 'tu-hint' }, host.t('parents_empty')),
      e('div', { class: 'tu-card', style: 'padding:12px 14px' }, e('h2', { style: 'margin-bottom:8px' }, host.t(g.id ? 'parent_edit' : 'parent_new')),
        e('div', { class: 'tu-two' }, Field(host.t('f_name'), e('input', { class: 'tu-input', ...bind(g, 'name') })), Field(host.t('f_relation'), e('input', { class: 'tu-input', placeholder: host.t('f_relation_ph'), ...bind(g, 'relation') }))),
        e('div', { class: 'tu-two', style: 'margin-top:8px' }, Field(host.t('f_phone'), e('input', { class: 'tu-input', ...bind(g, 'phone') })), Field(host.t('f_email'), e('input', { class: 'tu-input', type: 'email', ...bind(g, 'email') }))),
        e('div', { class: 'tu-row', style: 'margin-top:10px' }, e('button', { class: 'tu-btn primary sm', onClick: saveGuardian }, host.t('save')),
          g.id ? e('button', { class: 'tu-btn sm', onClick: () => Object.assign(g, { id: null, name: '', relation: '', phone: '', email: '' }) }, host.t('cancel')) : null)),
      e('div', { class: 'tu-hint' }, 'ℹ ' + host.t('parents_note')))

    const lessonsTab = () => {
      const list = office.lessons.value.filter(l => Number(l.student_id) === Number(id.value)).sort((a, b) => (b.lesson_date + b.lesson_time).localeCompare(a.lesson_date + a.lesson_time))
      return e('div', { class: 'tu-form' },
        e('div', { class: 'tu-row' }, e('button', { class: 'tu-btn primary sm', onClick: () => layer.open(null, { student_id: Number(id.value) }) }, '+ ' + host.t('lesson_new'))),
        list.length ? e('div', { class: 'tu-list' }, list.slice(0, 60).map(l => e('div', { class: 'tu-item', key: l.id, onClick: () => layer.open(l) },
          e('div', { class: 'm' }, e('b', null, dayTitle(host, l.lesson_date) + ' · ' + hm(l.lesson_time)), e('span', null, [host.t('format_' + l.format), money(host, l.price), l.moves ? '↔ ' + l.moves : ''].filter(Boolean).join(' · '))), LessonChip(host, l.status)))) : e('div', { class: 'tu-hint' }, host.t('schedule_empty')))
    }
    const journalTab = () => e('div', { class: 'tu-form' },
      e('div', { class: 'tu-row' }, e('button', { class: 'tu-btn primary sm', onClick: () => subOpen('entry') }, '+ ' + host.t('entry_new'))),
      data.entries.length ? e('div', { class: 'tu-list' }, data.entries.map(en => e('div', { class: 'tu-item', key: en.id, onClick: () => subOpen('entry', en) },
        e('div', { class: 'm' }, e('b', null, en.topic), e('span', null, [dayTitle(host, en.entry_date, false), en.difficulties ? '⚠ ' + en.difficulties : ''].filter(Boolean).join(' · '))), e('span', { class: 'tu-stars' }, stars(en.score))))) : e('div', { class: 'tu-hint' }, host.t('journal_empty')))
    const homeworkTab = () => e('div', { class: 'tu-form' },
      e('div', { class: 'tu-row' }, e('button', { class: 'tu-btn primary sm', onClick: () => subOpen('hw') }, '+ ' + host.t('hw_new'))),
      data.homework.length ? e('div', { class: 'tu-list' }, data.homework.map(h => e('div', { class: 'tu-item', key: h.id, onClick: () => subOpen('hw', h) },
        e('div', { class: 'm' }, e('b', null, h.topic), e('span', null, dayTitle(host, h.issued_on, false) + (h.due_on ? ' → ' + dayTitle(host, h.due_on, false) : ''))), HwChip(host, hwShown(h))))) : e('div', { class: 'tu-hint' }, host.t('homework_empty')))
    const paymentsTab = () => {
      const s = fresh()
      return e('div', { class: 'tu-form' },
        e('div', { class: 'tu-grid tu-g4' },
          e('div', { class: 'tu-card tu-kpi' }, e('div', { class: 'k' }, host.t('pay_done')), e('div', { class: 'v' }, s.lessons_done ?? 0)),
          e('div', { class: 'tu-card tu-kpi' }, e('div', { class: 'k' }, host.t('pay_paid')), e('div', { class: 'v' }, s.lessons_paid ?? 0)),
          e('div', { class: 'tu-card tu-kpi' }, e('div', { class: 'k' }, host.t('pay_balance')), e('div', { class: 'v tu-money ' + (s.debt > 0 ? 'bad' : '') }, s.debt > 0 ? '−' + money(host, s.debt) : money(host, s.balance ?? 0)))),
        e('div', { class: 'tu-row' }, e('button', { class: 'tu-btn primary sm', onClick: () => subOpen('pay') }, '+ ' + host.t('pay_new'))),
        data.payments.length ? e('div', { class: 'tu-list' }, data.payments.map(p => e('div', { class: 'tu-item', key: p.id, onClick: () => subOpen('pay', p) },
          e('div', { class: 'm' }, e('b', null, money(host, p.amount)), e('span', null, [dayTitle(host, p.paid_on, false), p.lessons_count ? fmt(host.t('pay_lessons'), { n: p.lessons_count }) : '', p.note].filter(Boolean).join(' · ')))))) : e('div', { class: 'tu-hint' }, host.t('pay_empty')))
    }
    const reportTab = () => e('div', { class: 'tu-form' },
      e('div', { class: 'tu-hint' }, host.t('report_hint')),
      e('div', { class: 'tu-three' },
        Field(host.t('f_from'), e('input', { class: 'tu-input', type: 'date', ...bind(rp, 'from') })),
        Field(host.t('f_to'), e('input', { class: 'tu-input', type: 'date', ...bind(rp, 'to') })),
        e('label', { class: 'tu-row tu-hint', style: 'align-self:end' }, e('input', { type: 'checkbox', checked: rp.with_money, onChange: ev => { rp.with_money = ev.target.checked } }), host.t('report_money'))),
      e('div', { class: 'tu-row' }, e('button', { class: 'tu-btn primary sm', onClick: makeReport }, '✨ ' + host.t('report_make')), data.report ? e('button', { class: 'tu-btn sm', onClick: copyReport }, '📋 ' + host.t('copy')) : null),
      data.report ? e('textarea', { class: 'tu-area', style: 'min-height:260px', value: data.report.body, onInput: ev => { data.report = { ...data.report, body: ev.target.value } } }) : null)

    return () => {
      const body = tab.value === 'profile' ? form() : tab.value === 'parents' ? parentsTab() : tab.value === 'lessons' ? lessonsTab() : tab.value === 'journal' ? journalTab() : tab.value === 'homework' ? homeworkTab() : tab.value === 'payments' ? paymentsTab() : reportTab()
      return e(Modal, { title: props.student || id.value ? (f.name || host.t('student_card')) : host.t('student_add'), wide: true, onClose: props.onClose },
        id.value ? e('div', { class: 'tu-tabs' }, TABS.map(k => e('button', { key: k, type: 'button', class: tab.value === k ? 'on' : '', onClick: () => { tab.value = k } }, host.t('tab_' + k)))) : null,
        body,
        layer.view(),
        sub.value?.kind === 'entry' ? e(EntryModal, { key: sub.value.key, host, office, entry: sub.value.item, defaults: { student_id: Number(id.value), subject_id: f.subject_id }, onClose: subClose }) : null,
        sub.value?.kind === 'hw' ? e(HomeworkModal, { key: sub.value.key, host, office, hw: sub.value.item, defaults: { student_id: Number(id.value), subject_id: f.subject_id }, onClose: subClose }) : null,
        sub.value?.kind === 'pay' ? e(PaymentModal, { key: sub.value.key, host, office, payment: sub.value.item, defaults: { student_id: Number(id.value) }, onClose: subClose }) : null)
    }
  },
})

// ---------------------------------------------------------------- students page
export const StudentsPage = makePage('nav_students', ({ host, office }) => {
  const status = ref('active')
  const search = ref('')
  const modal = ref(null)
  const open = student => { modal.value = { student: student || null, key: Math.random() } }
  const close = () => { modal.value = null }

  return () => {
    const all = office.students.value
    const counts = Object.fromEntries(['all', ...STUDENT_STATUSES].map(k => [k, k === 'all' ? all.length : all.filter(s => s.status === k).length]))
    const q = search.value.trim().toLowerCase()
    const shown = all.filter(s => (status.value === 'all' || s.status === status.value) && (!q || [s.name, s.grade, s.school, s.phone].some(x => String(x || '').toLowerCase().includes(q))))
    return {
      actions: e('button', { class: 'tu-btn primary', onClick: () => open(null) }, '+ ' + host.t('student_add')),
      sub: host.t('students_sub'),
      content: e('div', { class: 'tu-grid' },
        e('div', { class: 'tu-filters' },
          e('div', { class: 'tu-seg' }, ['active', 'new', 'paused', 'finished', 'archived', 'all'].map(k => e('button', { key: k, class: status.value === k ? 'on' : '', onClick: () => { status.value = k } }, (k === 'all' ? host.t('all') : host.t('student_' + k)) + ' · ' + counts[k]))),
          e('input', { class: 'tu-input', type: 'search', placeholder: host.t('search'), value: search.value, onInput: ev => { search.value = ev.target.value } })),
        e('div', { class: 'tu-card tu-tbl-wrap' }, shown.length
          ? e('table', { class: 'tu-tbl' },
            e('thead', null, e('tr', null, ['f_student', 'f_subject', 'f_status', 'next_lesson', 'pay_done', 'pay_balance'].map(k => e('th', { key: k }, host.t(k))))),
            e('tbody', null, shown.map(s => e('tr', { class: 'click', key: s.id, onClick: () => open(s) },
              e('td', null, e('div', { class: 'tu-row', style: 'flex-wrap:nowrap' }, Avatar(s.name, office.subjectById.value.get(Number(s.subject_id))?.color), e('div', { class: 't' }, e('b', null, s.name), e('span', null, [s.grade, s.format ? host.t('format_' + s.format) : ''].filter(Boolean).join(' · '))))),
              e('td', null, office.subjectById.value.get(Number(s.subject_id))?.name || '—'),
              e('td', null, StudentChip(host, s.status)),
              e('td', null, s.next_lesson_date ? dayTitle(host, s.next_lesson_date, false) + ' ' + hm(s.next_lesson_time) : '—'),
              e('td', null, s.lessons_done),
              e('td', null, e('span', { class: 'tu-money ' + (s.debt > 0 ? 'bad' : '') }, s.debt > 0 ? '−' + money(host, s.debt) : money(host, s.balance)))))))
          : e('div', { class: 'tu-empty' }, e('div', { class: 'big' }, '🎓'), e('p', null, host.t('students_empty'))))),
      modal: modal.value ? e(StudentModal, { key: modal.value.key, host, office, student: modal.value.student, onClose: close }) : null,
    }
  }
})
