// Journal, homework and payments: their cards (modals) and pages.
import {
  e, defineComponent, ref, reactive, computed, watch, onMounted, Modal, Q, makePage, Field, bind, bindNum, StudentSelect, SubjectSelect, HwChip, Chip, Avatar,
  loc, todayStr, addDays, ymOf, dayTitle, money, lines, hwShown, isOverdueHw, HW_STATUSES, HW_COLOR, isChargedStatus,
} from './core.mjs'

const stars = n => (n ? '★'.repeat(n) + '☆'.repeat(5 - n) : '')
const errText = (host, err) => String(err?.message || host.t('error'))

// ---------------------------------------------------------------- journal entry card
export const EntryModal = defineComponent({
  name: 'TuEntryModal',
  props: { host: Object, office: Object, entry: Object, defaults: Object, onClose: Function },
  setup(props) {
    const { host, office } = props
    const src = props.entry || {}
    const d = props.defaults || {}
    const f = reactive({
      student_id: src.student_id ?? d.student_id ?? office.students.value.find(s => s.status === 'active')?.id ?? office.students.value[0]?.id ?? null,
      lesson_id: src.lesson_id ?? d.lesson_id ?? null,
      subject_id: src.subject_id ?? d.subject_id ?? null,
      entry_date: src.entry_date ?? d.entry_date ?? todayStr(),
      topic: src.topic ?? d.topic ?? '', material: src.material ?? '', exercises: src.exercises ?? '', results: src.results ?? '', difficulties: src.difficulties ?? '',
      homework_text: src.homework_text ?? '', comment: src.comment ?? '', score: src.score ?? null, links: src.links ?? '', also_hw: false,
    })
    if (f.student_id != null) f.student_id = Number(f.student_id)
    const busy = ref(false)
    const pickStudent = id => { const s = office.studentById.value.get(Number(id)); if (s && !f.subject_id) f.subject_id = s.subject_id }

    async function save() {
      if (!f.topic.trim() || !f.student_id) return host.toast(host.t('entry_need_topic'), 'error')
      busy.value = true
      const { also_hw, ...rest } = f
      const input = { ...rest, subject_id: f.subject_id || null, lesson_id: f.lesson_id || null, score: f.score || null }
      const ok = await office.run(Q.saveEntry, { id: props.entry?.id || null, input })
      if (ok && also_hw && f.homework_text.trim()) {
        await office.run(Q.saveHomework, { id: null, input: { student_id: f.student_id, subject_id: f.subject_id || null, lesson_id: f.lesson_id || null, topic: f.topic, body: f.homework_text, issued_on: f.entry_date, due_on: addDays(f.entry_date, 7) } }, 'hw_saved')
      }
      busy.value = false
      if (ok) props.onClose()
    }
    async function remove() {
      if (!globalThis.confirm(host.t('confirm_delete'))) return
      if (await office.run(Q.delEntry, { id: props.entry.id }, 'deleted')) props.onClose()
    }

    return () => e(Modal, { title: host.t(props.entry ? 'entry_edit' : 'entry_new'), wide: true, onClose: props.onClose },
      e('div', { class: 'tu-form' },
        e('div', { class: 'tu-three' },
          Field(host.t('f_student'), StudentSelect(host, office, f, 'student_id', { all: true, onPick: pickStudent })),
          Field(host.t('f_subject'), SubjectSelect(host, office, f, 'subject_id')),
          Field(host.t('f_date'), e('input', { class: 'tu-input', type: 'date', ...bind(f, 'entry_date') }))),
        Field(host.t('f_topic'), e('input', { class: 'tu-input', ...bind(f, 'topic') })),
        e('div', { class: 'tu-two' },
          Field(host.t('f_material'), e('textarea', { class: 'tu-area', style: 'min-height:90px', ...bind(f, 'material') })),
          Field(host.t('f_exercises'), e('textarea', { class: 'tu-area', style: 'min-height:90px', ...bind(f, 'exercises') }))),
        e('div', { class: 'tu-two' },
          Field(host.t('f_results'), e('textarea', { class: 'tu-area', style: 'min-height:90px', ...bind(f, 'results') })),
          Field(host.t('f_difficulties'), e('textarea', { class: 'tu-area', style: 'min-height:90px', ...bind(f, 'difficulties') }))),
        Field(host.t('f_homework_text'), e('textarea', { class: 'tu-area', style: 'min-height:80px', ...bind(f, 'homework_text') })),
        f.homework_text.trim() ? e('label', { class: 'tu-row tu-hint' }, e('input', { type: 'checkbox', checked: f.also_hw, onChange: ev => { f.also_hw = ev.target.checked } }), host.t('entry_also_hw')) : null,
        Field(host.t('f_teacher_comment'), e('textarea', { class: 'tu-area', style: 'min-height:70px', ...bind(f, 'comment') })),
        e('div', { class: 'tu-two' },
          Field(host.t('f_score'), e('div', { class: 'tu-seg' }, [1, 2, 3, 4, 5].map(n => e('button', { key: n, type: 'button', class: f.score === n ? 'on' : '', onClick: () => { f.score = f.score === n ? null : n } }, String(n))))),
          Field(host.t('f_links'), e('textarea', { class: 'tu-area', style: 'min-height:70px', placeholder: host.t('f_links_ph'), ...bind(f, 'links') }))),
        e('div', { class: 'tu-row' },
          e('button', { class: 'tu-btn primary', disabled: busy.value, onClick: save }, host.t('save')),
          e('button', { class: 'tu-btn', onClick: props.onClose }, host.t('cancel')),
          e('span', { class: 'tu-grow' }),
          props.entry ? e('button', { class: 'tu-btn danger', onClick: remove }, host.t('delete')) : null)))
  },
})

// ---------------------------------------------------------------- homework card
export const HomeworkModal = defineComponent({
  name: 'TuHomeworkModal',
  props: { host: Object, office: Object, hw: Object, defaults: Object, onClose: Function },
  setup(props) {
    const { host, office } = props
    const src = props.hw || {}
    const d = props.defaults || {}
    const f = reactive({
      student_id: src.student_id ?? d.student_id ?? office.students.value.find(s => s.status === 'active')?.id ?? office.students.value[0]?.id ?? null,
      subject_id: src.subject_id ?? d.subject_id ?? null, lesson_id: src.lesson_id ?? d.lesson_id ?? null,
      topic: src.topic ?? d.topic ?? '', body: src.body ?? d.body ?? '', issued_on: src.issued_on ?? todayStr(), due_on: src.due_on ?? addDays(todayStr(), 7),
      status: src.status ?? 'issued', comment: src.comment ?? '', links: src.links ?? '',
    })
    if (f.student_id != null) f.student_id = Number(f.student_id)
    const busy = ref(false)
    const draftBusy = ref(false)

    async function draft() {
      if (!f.student_id) return
      draftBusy.value = true
      try {
        const r = (await host.gql(Q.draft, { student_id: Number(f.student_id), topic: f.topic || null, count: 6, locale: loc(host).slice(0, 2) })).tutorHomeworkDraft
        if (!f.topic.trim()) f.topic = r.topic
        f.body = r.body
        host.toast(host.t('draft_ready'), 'success')
      } catch (err) { host.toast(errText(host, err), 'error') } finally { draftBusy.value = false }
    }
    async function save() {
      if (!f.topic.trim() || !f.student_id) return host.toast(host.t('hw_need_topic'), 'error')
      busy.value = true
      const input = { ...f, subject_id: f.subject_id || null, lesson_id: f.lesson_id || null, due_on: f.due_on || null }
      const ok = await office.run(Q.saveHomework, { id: props.hw?.id || null, input })
      busy.value = false
      if (ok) props.onClose()
    }
    async function remove() {
      if (!globalThis.confirm(host.t('confirm_delete'))) return
      if (await office.run(Q.delHomework, { id: props.hw.id }, 'deleted')) props.onClose()
    }

    return () => e(Modal, { title: host.t(props.hw ? 'hw_edit' : 'hw_new'), onClose: props.onClose },
      e('div', { class: 'tu-form' },
        e('div', { class: 'tu-two' },
          Field(host.t('f_student'), StudentSelect(host, office, f, 'student_id', { all: true })),
          Field(host.t('f_subject'), SubjectSelect(host, office, f, 'subject_id'))),
        Field(host.t('f_topic'), e('input', { class: 'tu-input', ...bind(f, 'topic') })),
        e('div', { class: 'tu-row' },
          e('button', { class: 'tu-btn', disabled: draftBusy.value, onClick: draft }, '✨ ' + host.t('hw_ai_draft')),
          e('span', { class: 'tu-hint' }, host.t('hw_ai_hint'))),
        Field(host.t('f_hw_text'), e('textarea', { class: 'tu-area', style: 'min-height:170px', ...bind(f, 'body') })),
        e('div', { class: 'tu-three' },
          Field(host.t('f_issued'), e('input', { class: 'tu-input', type: 'date', ...bind(f, 'issued_on') })),
          Field(host.t('f_due'), e('input', { class: 'tu-input', type: 'date', ...bind(f, 'due_on') })),
          Field(host.t('f_status'), e('select', { class: 'tu-select', value: f.status, onChange: ev => { f.status = ev.target.value } }, HW_STATUSES.map(s => e('option', { key: s, value: s }, host.t('hw_' + s)))))),
        Field(host.t('f_teacher_comment'), e('textarea', { class: 'tu-area', style: 'min-height:60px', ...bind(f, 'comment') })),
        Field(host.t('f_links'), e('textarea', { class: 'tu-area', style: 'min-height:56px', placeholder: host.t('f_links_ph'), ...bind(f, 'links') })),
        e('div', { class: 'tu-row' },
          e('button', { class: 'tu-btn primary', disabled: busy.value, onClick: save }, host.t('save')),
          e('button', { class: 'tu-btn', onClick: props.onClose }, host.t('cancel')),
          e('span', { class: 'tu-grow' }),
          props.hw ? e('button', { class: 'tu-btn danger', onClick: remove }, host.t('delete')) : null)))
  },
})

// ---------------------------------------------------------------- payment card
export const PaymentModal = defineComponent({
  name: 'TuPaymentModal',
  props: { host: Object, office: Object, payment: Object, defaults: Object, onClose: Function },
  setup(props) {
    const { host, office } = props
    const src = props.payment || {}
    const sid = src.student_id ?? props.defaults?.student_id ?? office.students.value.find(s => s.status === 'active')?.id ?? null
    const f = reactive({ student_id: sid != null ? Number(sid) : null, paid_on: src.paid_on ?? todayStr(), amount: src.amount ?? null, lessons_count: src.lessons_count ?? 0, note: src.note ?? '' })
    const student = () => office.studentById.value.get(Number(f.student_id))
    // A new payment starts with the debt of the student, or a package of four lessons.
    if (!props.payment && f.student_id) { const s = student(); f.amount = s?.debt > 0 ? s.debt : (s?.price ? s.price * 4 : null) }
    const onPick = id => { const s = office.studentById.value.get(Number(id)); if (s && !props.payment) f.amount = s.debt > 0 ? s.debt : (s.price ? s.price * 4 : null) }
    const busy = ref(false)

    async function save() {
      if (!f.student_id || f.amount == null || Number(f.amount) < 0) return host.toast(host.t('pay_need_amount'), 'error')
      busy.value = true
      const ok = await office.run(Q.savePayment, { id: props.payment?.id || null, input: { student_id: f.student_id, paid_on: f.paid_on, amount: Number(f.amount), lessons_count: Number(f.lessons_count) || 0, note: f.note } })
      busy.value = false
      if (ok) props.onClose()
    }
    async function remove() {
      if (!globalThis.confirm(host.t('confirm_delete'))) return
      if (await office.run(Q.delPayment, { id: props.payment.id }, 'deleted')) props.onClose()
    }

    return () => {
      const s = student()
      return e(Modal, { title: host.t(props.payment ? 'pay_edit' : 'pay_new'), small: true, onClose: props.onClose },
        e('div', { class: 'tu-form' },
          Field(host.t('f_student'), StudentSelect(host, office, f, 'student_id', { all: true, onPick })),
          s ? e('div', { class: 'tu-hint' }, host.t('pay_balance') + ': ', e('span', { class: 'tu-money ' + (s.debt > 0 ? 'bad' : 'ok') }, s.debt > 0 ? '−' + money(host, s.debt) : money(host, s.balance))) : null,
          e('div', { class: 'tu-two' },
            Field(host.t('f_date'), e('input', { class: 'tu-input', type: 'date', ...bind(f, 'paid_on') })),
            Field(host.t('f_amount'), e('input', { class: 'tu-input', type: 'number', min: 0, step: 'any', ...bindNum(f, 'amount') }))),
          Field(host.t('f_lessons_count'), e('input', { class: 'tu-input', type: 'number', min: 0, ...bindNum(f, 'lessons_count') })),
          Field(host.t('f_note'), e('input', { class: 'tu-input', ...bind(f, 'note') })),
          e('div', { class: 'tu-row' },
            e('button', { class: 'tu-btn primary', disabled: busy.value, onClick: save }, host.t('save')),
            e('button', { class: 'tu-btn', onClick: props.onClose }, host.t('cancel')),
            e('span', { class: 'tu-grow' }),
            props.payment ? e('button', { class: 'tu-btn danger', onClick: remove }, host.t('delete')) : null)))
    }
  },
})

// ---------------------------------------------------------------- journal page
export const JournalPage = makePage('nav_journal', ({ host, office }) => {
  const entries = ref([])
  const flt = reactive({ student_id: '', search: '', from: '', to: '' })
  const modal = ref(null)
  let timer = null
  async function load() {
    try {
      entries.value = (await host.gql(Q.entries, { student_id: flt.student_id ? Number(flt.student_id) : null, search: flt.search || null, from: flt.from || null, to: flt.to || null })).tutorEntries
    } catch { entries.value = [] }
  }
  onMounted(load)
  watch(() => [flt.student_id, flt.from, flt.to], load)
  watch(() => flt.search, () => { clearTimeout(timer); timer = setTimeout(load, 300) })
  watch(() => office.lessons.value, load)
  const open = (entry, defaults) => { modal.value = { entry: entry || null, defaults: defaults || {}, key: Math.random() } }
  const close = () => { modal.value = null; load() }

  return () => {
    const byMonth = new Map()
    entries.value.forEach(en => byMonth.set(ymOf(en.entry_date), [...(byMonth.get(ymOf(en.entry_date)) || []), en]))
    return {
      actions: e('button', { class: 'tu-btn primary', onClick: () => open(null, flt.student_id ? { student_id: Number(flt.student_id) } : {}) }, '+ ' + host.t('entry_new')),
      sub: host.t('journal_sub'),
      content: e('div', { class: 'tu-grid' },
        e('div', { class: 'tu-filters' },
          e('select', { class: 'tu-select', value: flt.student_id, onChange: ev => { flt.student_id = ev.target.value } }, e('option', { value: '' }, host.t('all_students')), office.students.value.map(s => e('option', { key: s.id, value: s.id }, s.name))),
          e('input', { class: 'tu-input', type: 'search', placeholder: host.t('journal_search'), ...bind(flt, 'search') }),
          e('input', { class: 'tu-input', type: 'date', title: host.t('f_from'), ...bind(flt, 'from') }),
          e('input', { class: 'tu-input', type: 'date', title: host.t('f_to'), ...bind(flt, 'to') }),
          e('span', { class: 'tu-hint' }, host.t('n_entries').replace('{n}', entries.value.length))),
        entries.value.length
          ? [...byMonth.entries()].map(([ym, items]) => e('div', { class: 'tu-card', key: ym },
            e('h2', null, new Intl.DateTimeFormat(loc(host), { month: 'long', year: 'numeric' }).format(new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1, 1)), e('small', null, items.length)),
            e('div', { class: 'tu-list' }, items.map(en => e('div', { class: 'tu-item', key: en.id, onClick: () => open(en) },
              Avatar(office.nameOf(en.student_id), office.subjectById.value.get(Number(en.subject_id))?.color),
              e('div', { class: 'm' }, e('b', null, en.topic), e('span', null, [dayTitle(host, en.entry_date, false), office.nameOf(en.student_id), en.difficulties ? '⚠ ' + en.difficulties : ''].filter(Boolean).join(' · '))),
              e('span', { class: 'tu-stars' }, stars(en.score)))))))
          : e('div', { class: 'tu-card tu-empty' }, e('div', { class: 'big' }, '📓'), e('p', null, host.t('journal_empty')))),
      modal: modal.value ? e(EntryModal, { key: modal.value.key, host, office, entry: modal.value.entry, defaults: modal.value.defaults, onClose: close }) : null,
    }
  }
})

// ---------------------------------------------------------------- homework page
export const HomeworkPage = makePage('nav_homework', ({ host, office }) => {
  const items = ref([])
  const filter = ref('open')
  const student = ref('')
  const modal = ref(null)
  async function load() {
    try { items.value = (await host.gql(Q.homework, { student_id: student.value ? Number(student.value) : null, today: todayStr() })).tutorHomework } catch { items.value = [] }
  }
  onMounted(load)
  watch(student, load)
  const open = (hw, defaults) => { modal.value = { hw: hw || null, defaults: defaults || {}, key: Math.random() } }
  const close = () => { modal.value = null; load() }
  async function setStatus(h, status) {
    try { await host.gql(Q.hwStatus, { id: h.id, status }); await load() } catch (err) { host.toast(errText(host, err), 'error') }
  }

  return () => {
    const today = todayStr()
    const all = items.value
    const counts = {
      open: all.filter(h => ['issued', 'in_progress', 'rework'].includes(h.status)).length,
      overdue: all.filter(h => isOverdueHw(h, today)).length,
      submitted: all.filter(h => h.status === 'submitted').length,
      done: all.filter(h => ['done', 'checked'].includes(h.status)).length,
      all: all.length,
    }
    const shown = all.filter(h => {
      if (filter.value === 'open') return ['issued', 'in_progress', 'rework'].includes(h.status)
      if (filter.value === 'overdue') return isOverdueHw(h, today)
      if (filter.value === 'submitted') return h.status === 'submitted'
      if (filter.value === 'done') return ['done', 'checked'].includes(h.status)
      return true
    })
    return {
      actions: e('button', { class: 'tu-btn primary', onClick: () => open(null, student.value ? { student_id: Number(student.value) } : {}) }, '+ ' + host.t('hw_new')),
      sub: host.t('homework_sub'),
      content: e('div', { class: 'tu-grid' },
        e('div', { class: 'tu-filters' },
          e('div', { class: 'tu-seg' }, ['open', 'overdue', 'submitted', 'done', 'all'].map(k => e('button', { key: k, class: filter.value === k ? 'on' : '', onClick: () => { filter.value = k } }, host.t('hwf_' + k) + ' · ' + counts[k]))),
          e('select', { class: 'tu-select', value: student.value, onChange: ev => { student.value = ev.target.value } }, e('option', { value: '' }, host.t('all_students')), office.students.value.map(s => e('option', { key: s.id, value: s.id }, s.name)))),
        e('div', { class: 'tu-card tu-tbl-wrap' },
          shown.length
            ? e('table', { class: 'tu-tbl' },
              e('thead', null, e('tr', null, ['f_student', 'f_topic', 'f_issued', 'f_due', 'f_status'].map(k => e('th', { key: k }, host.t(k))))),
              e('tbody', null, shown.map(h => e('tr', { class: 'click', key: h.id, onClick: () => open(h) },
                e('td', null, e('div', { class: 'tu-row', style: 'flex-wrap:nowrap' }, Avatar(office.nameOf(h.student_id), office.subjectById.value.get(Number(h.subject_id))?.color), office.nameOf(h.student_id))),
                e('td', { class: 't' }, e('b', null, h.topic), e('span', null, (h.body || '').slice(0, 70))),
                e('td', null, dayTitle(host, h.issued_on, false)),
                e('td', null, h.due_on ? dayTitle(host, h.due_on, false) : '—'),
                e('td', { onClick: ev => ev.stopPropagation() },
                  e('div', { class: 'tu-row', style: 'flex-wrap:nowrap' }, HwChip(host, hwShown(h, today)),
                    e('select', { class: 'tu-select', style: 'width:auto;padding:3px 8px;font-size:12px', value: h.status, onChange: ev => setStatus(h, ev.target.value) }, HW_STATUSES.map(s => e('option', { key: s, value: s }, host.t('hw_' + s))))))))))
            : e('div', { class: 'tu-empty' }, e('div', { class: 'big' }, '✅'), e('p', null, host.t('homework_empty'))))),
      modal: modal.value ? e(HomeworkModal, { key: modal.value.key, host, office, hw: modal.value.hw, defaults: modal.value.defaults, onClose: close }) : null,
    }
  }
})

// ---------------------------------------------------------------- payments page
export const PaymentsPage = makePage('nav_payments', ({ host, office }) => {
  const payments = ref([])
  const modal = ref(null)
  async function load() { try { payments.value = (await host.gql(Q.payments, {})).tutorPayments } catch { payments.value = [] } }
  onMounted(load)
  watch(() => office.students.value, load)
  const open = (payment, defaults) => { modal.value = { payment: payment || null, defaults: defaults || {}, key: Math.random() } }
  const close = () => { modal.value = null; load() }

  return () => {
    const today = todayStr()
    const ym = ymOf(today)
    const rows = office.students.value.filter(s => !['archived'].includes(s.status) || s.debt > 0)
    const debtors = rows.filter(s => s.debt > 0).sort((a, b) => b.debt - a.debt)
    const totalDebt = debtors.reduce((s, x) => s + x.debt, 0)
    const received = payments.value.filter(p => ymOf(p.paid_on) === ym).reduce((s, p) => s + p.amount, 0)
    const earned = office.lessons.value.filter(l => ymOf(l.lesson_date) === ym && isChargedStatus(l.status)).reduce((s, l) => s + l.price, 0)
    const expected = office.lessons.value.filter(l => ymOf(l.lesson_date) === ym && ['planned', 'confirmed'].includes(l.status)).reduce((s, l) => s + l.price, 0)
    const kpi = (k, v, d, cls) => e('div', { class: 'tu-card tu-kpi' }, e('div', { class: 'k' }, host.t(k)), e('div', { class: 'v ' + (cls || '') }, v), e('div', { class: 'd' }, d))
    return {
      actions: e('button', { class: 'tu-btn primary', onClick: () => open(null, {}) }, '+ ' + host.t('pay_new')),
      sub: host.t('payments_sub'),
      content: e('div', { class: 'tu-grid' },
        e('div', { class: 'tu-grid tu-g4' },
          kpi('pay_kpi_debt', money(host, totalDebt), debtors.length ? host.t('pay_kpi_debtors').replace('{n}', debtors.length) : host.t('pay_kpi_none'), totalDebt > 0 ? 'tu-money bad' : ''),
          kpi('pay_kpi_received', money(host, received), host.t('this_month')),
          kpi('pay_kpi_earned', money(host, earned), host.t('pay_kpi_earned_note')),
          kpi('pay_kpi_expected', money(host, expected), host.t('pay_kpi_expected_note'))),
        e('div', { class: 'tu-grid tu-main' },
          e('div', { class: 'tu-card tu-tbl-wrap' }, e('h2', null, host.t('pay_by_student')),
            e('table', { class: 'tu-tbl' },
              e('thead', null, e('tr', null, ['f_student', 'pay_done', 'pay_paid', 'pay_balance', ''].map((k, i) => e('th', { key: i }, k ? host.t(k) : '')))),
              e('tbody', null, rows.map(s => e('tr', { class: 'click', key: s.id, onClick: () => open(null, { student_id: Number(s.id) }) },
                e('td', null, e('div', { class: 'tu-row', style: 'flex-wrap:nowrap' }, Avatar(s.name, office.subjectById.value.get(Number(s.subject_id))?.color), e('div', null, e('b', null, s.name), e('div', { class: 'tu-hint' }, s.price ? money(host, s.price) + ' / ' + host.t('per_lesson') : '')))),
                e('td', null, s.lessons_done),
                e('td', null, s.lessons_paid),
                e('td', null, e('span', { class: 'tu-money ' + (s.debt > 0 ? 'bad' : s.balance > 0 ? 'ok' : '') }, s.debt > 0 ? '−' + money(host, s.debt) : money(host, s.balance))),
                e('td', null, e('button', { class: 'tu-btn sm', onClick: ev => { ev.stopPropagation(); open(null, { student_id: Number(s.id) }) } }, '+')))))),
            ),
          e('div', { class: 'tu-card' }, e('h2', null, host.t('pay_history'), e('small', null, payments.value.length)),
            payments.value.length
              ? e('div', { class: 'tu-list' }, payments.value.slice(0, 25).map(p => e('div', { class: 'tu-item', key: p.id, onClick: () => open(p) },
                e('div', { class: 'm' }, e('b', null, money(host, p.amount)), e('span', null, [dayTitle(host, p.paid_on, false), office.nameOf(p.student_id), p.lessons_count ? host.t('pay_lessons').replace('{n}', p.lessons_count) : ''].filter(Boolean).join(' · '))))))
              : e('div', { class: 'tu-hint' }, host.t('pay_empty'))))),
      modal: modal.value ? e(PaymentModal, { key: modal.value.key, host, office, payment: modal.value.payment, defaults: modal.value.defaults, onClose: close }) : null,
    }
  }
})
