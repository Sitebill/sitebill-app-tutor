// Lesson card and the schedule page: day, week, month and list views.
import {
  e, defineComponent, ref, reactive, computed, watch, onMounted, Modal, Q, makePage, Field, bind, bindNum, StudentSelect, SubjectSelect, LessonChip,
  loc, todayStr, addDays, weekStart, isoWeekday, shiftYm, monthTitle, dayTitle, weekdays, hm, endTime, money, fmt, parts, LESSON_STATUSES, LESSON_COLOR, UPCOMING,
} from './core.mjs'
import { EntryModal } from './work.mjs'

const errText = (host, err) => String(err?.message || host.t('error'))
const timeInputValue = t => hm(t) || '10:00'

/** A readable line for a slot problem found by the assistant. */
export function conflictText(host, office, c) {
  const p = parts(c.meta)
  if (c.code === 'overlap') {
    const other = office.lessons.value.find(l => Number(l.id) === Number(c.lesson_id))
    return fmt(host.t('conf_overlap'), { who: other ? office.nameOf(other.student_id) : '?', time: p[0] || '' })
  }
  if (c.code === 'off_hours') return fmt(host.t('conf_off_hours'), { range: String(c.meta || '').replace('-', '–') })
  return host.t('conf_' + c.code)
}

// ---------------------------------------------------------------- lesson card
export const LessonModal = defineComponent({
  name: 'TuLessonModal',
  props: { host: Object, office: Object, lesson: Object, defaults: Object, onClose: Function, onEntry: Function },
  setup(props) {
    const { host, office } = props
    const src = props.lesson || {}
    const d = props.defaults || {}
    const cfg = office.settings.value
    const f = reactive({
      student_id: src.student_id ?? d.student_id ?? office.students.value.find(s => s.status === 'active')?.id ?? office.students.value[0]?.id ?? null,
      subject_id: src.subject_id ?? null, lesson_date: src.lesson_date ?? d.lesson_date ?? todayStr(), lesson_time: timeInputValue(src.lesson_time ?? d.lesson_time ?? cfg.work_from),
      duration: src.duration ?? cfg.default_duration ?? 60, format: src.format ?? 'online', place: src.place ?? '', price: src.price ?? null, status: src.status ?? 'planned',
      comment: src.comment ?? '', repeat_weeks: 1,
    })
    if (f.student_id != null) f.student_id = Number(f.student_id)
    const applyStudent = id => {
      const s = office.studentById.value.get(Number(id))
      if (!s || props.lesson) return
      f.subject_id = s.subject_id ?? null
      f.duration = s.duration || cfg.default_duration || 60
      f.format = s.format || 'online'
      f.price = s.price ?? cfg.default_price ?? null
    }
    if (!props.lesson) applyStudent(f.student_id)

    const conflicts = ref([])
    const slots = ref(null)
    const moves = ref([])
    const mv = reactive({ date: f.lesson_date, time: f.lesson_time, note: '' })
    const busy = ref(false)
    let timer = null
    async function check() {
      try {
        conflicts.value = (await host.gql(Q.conflicts, { date: f.lesson_date, time: f.lesson_time, duration: Number(f.duration) || 60, exclude_id: props.lesson ? Number(props.lesson.id) : null })).tutorConflicts
      } catch { conflicts.value = [] }
    }
    onMounted(() => {
      check()
      if (props.lesson) host.gql(Q.moves, { lesson_id: Number(props.lesson.id) }).then(r => { moves.value = r.tutorLessonMoves }).catch(() => {})
    })
    watch(() => [f.lesson_date, f.lesson_time, f.duration], () => { clearTimeout(timer); timer = setTimeout(check, 250) })

    async function loadSlots() {
      try { slots.value = (await host.gql(Q.slots, { date: f.lesson_date, duration: Number(f.duration) || 60, days: 3 })).tutorFreeSlots } catch { slots.value = [] }
    }
    async function save() {
      if (!f.student_id) return host.toast(host.t('lesson_need_student'), 'error')
      if (conflicts.value.length && !globalThis.confirm(host.t('conf_confirm') + '\n\n' + conflicts.value.map(c => '• ' + conflictText(host, office, c)).join('\n'))) return
      busy.value = true
      const { repeat_weeks, ...rest } = f
      const input = { ...rest, subject_id: f.subject_id || null, duration: Number(f.duration) || 60, price: f.price == null ? null : Number(f.price) }
      if (!props.lesson && Number(repeat_weeks) > 1) input.repeat_weeks = Number(repeat_weeks)
      const ok = await office.run(Q.saveLesson, { id: props.lesson?.id || null, input })
      busy.value = false
      if (ok) props.onClose()
    }
    async function setStatus(status) {
      busy.value = true
      const r = await office.run(Q.lessonStatus, { id: props.lesson.id, status }, 'saved')
      busy.value = false
      if (r) {
        if (r.tutorSetLessonStatus.length > 1) host.toast(host.t('next_lesson_created'), 'success')
        props.onClose()
      }
    }
    async function reschedule() {
      busy.value = true
      const r = await office.run(Q.reschedule, { id: props.lesson.id, date: mv.date, time: mv.time, note: mv.note || null }, 'rescheduled')
      busy.value = false
      if (r) props.onClose()
    }
    async function remove(series) {
      if (!globalThis.confirm(host.t(series ? 'confirm_delete_series' : 'confirm_delete'))) return
      if (await office.run(Q.delLesson, { id: props.lesson.id, series }, 'deleted')) props.onClose()
    }

    return () => {
      const student = office.studentById.value.get(Number(f.student_id))
      return e(Modal, { title: host.t(props.lesson ? 'lesson_edit' : 'lesson_new'), wide: true, onClose: props.onClose },
        e('div', { class: 'tu-form' },
          props.lesson ? e('div', { class: 'tu-row' }, LessonChip(host, props.lesson.status), props.lesson.series_id ? e('span', { class: 'tu-hint' }, '🔁 ' + host.t('lesson_series')) : null,
            props.lesson.moves ? e('span', { class: 'tu-hint' }, '↔ ' + fmt(host.t('lesson_moved'), { n: props.lesson.moves })) : null) : null,
          e('div', { class: 'tu-three' },
            Field(host.t('f_student'), StudentSelect(host, office, f, 'student_id', { onPick: applyStudent })),
            Field(host.t('f_subject'), SubjectSelect(host, office, f, 'subject_id')),
            Field(host.t('f_format'), e('select', { class: 'tu-select', value: f.format, onChange: ev => { f.format = ev.target.value } }, ['online', 'offline'].map(k => e('option', { key: k, value: k }, host.t('format_' + k)))))),
          e('div', { class: 'tu-three' },
            Field(host.t('f_date'), e('input', { class: 'tu-input', type: 'date', ...bind(f, 'lesson_date') })),
            Field(host.t('f_time'), e('input', { class: 'tu-input', type: 'time', step: 300, ...bind(f, 'lesson_time') })),
            Field(host.t('f_duration'), e('input', { class: 'tu-input', type: 'number', min: 5, step: 5, ...bindNum(f, 'duration') }))),
          e('div', { class: 'tu-row' }, e('span', { class: 'tu-hint' }, f.lesson_time && f.duration ? '⏱ ' + f.lesson_time + ' – ' + endTime(f.lesson_time, f.duration) : ''),
            e('button', { class: 'tu-btn sm', type: 'button', onClick: loadSlots }, '🕘 ' + host.t('free_slots'))),
          slots.value ? e('div', { class: 'tu-pick' }, slots.value.length
            ? slots.value.slice(0, 30).map(s => e('label', { key: s.date + s.time, class: s.date === f.lesson_date && s.time === f.lesson_time ? 'on' : '', onClick: () => { f.lesson_date = s.date; f.lesson_time = s.time } }, dayTitle(host, s.date, false) + ' ' + s.time))
            : e('span', { class: 'tu-hint' }, host.t('no_free_slots'))) : null,
          conflicts.value.map((c, i) => e('div', { class: 'tu-warn', key: i }, '⚠ ' + conflictText(host, office, c))),
          e('div', { class: 'tu-two' },
            Field(host.t('f_place'), e('input', { class: 'tu-input', placeholder: host.t('f_place_ph'), ...bind(f, 'place') })),
            Field(host.t('f_price'), e('input', { class: 'tu-input', type: 'number', min: 0, step: 'any', ...bindNum(f, 'price') }))),
          Field(host.t('f_comment'), e('input', { class: 'tu-input', ...bind(f, 'comment') })),
          !props.lesson ? Field(host.t('f_repeat'), e('select', { class: 'tu-select', value: f.repeat_weeks, onChange: ev => { f.repeat_weeks = Number(ev.target.value) } },
            [1, 4, 8, 12, 24].map(n => e('option', { key: n, value: n }, n === 1 ? host.t('repeat_once') : fmt(host.t('repeat_weekly'), { n }))))) : null,
          props.lesson ? e('div', { class: 'tu-card', style: 'padding:12px 14px' },
            e('h2', { style: 'margin-bottom:8px' }, host.t('lesson_status')),
            e('div', { class: 'tu-pick' }, LESSON_STATUSES.filter(s => s !== 'rescheduled').map(s => e('label', { key: s, class: props.lesson.status === s ? 'on' : '', style: `--cc:${LESSON_COLOR[s]}`, onClick: () => setStatus(s) }, host.t('lesson_' + s)))),
            e('div', { class: 'tu-hint', style: 'margin-top:6px' }, host.t('lesson_status_hint'))) : null,
          props.lesson ? e('div', { class: 'tu-card', style: 'padding:12px 14px' },
            e('h2', { style: 'margin-bottom:8px' }, host.t('lesson_reschedule')),
            e('div', { class: 'tu-three' },
              e('input', { class: 'tu-input', type: 'date', ...bind(mv, 'date') }), e('input', { class: 'tu-input', type: 'time', step: 300, ...bind(mv, 'time') }),
              e('input', { class: 'tu-input', placeholder: host.t('reschedule_note'), ...bind(mv, 'note') })),
            e('div', { class: 'tu-row', style: 'margin-top:8px' }, e('button', { class: 'tu-btn sm', disabled: busy.value, onClick: reschedule }, '↔ ' + host.t('reschedule'))),
            moves.value.length ? e('div', { style: 'margin-top:8px' }, e('div', { class: 'tu-hint' }, host.t('lesson_history')),
              moves.value.map(m => e('div', { class: 'tu-hint', key: m.id }, `${m.created_at || ''}: ${m.from_date} ${hm(m.from_time)} → ${m.to_date} ${hm(m.to_time)}${m.note ? ' · ' + m.note : ''}`))) : null) : null,
          e('div', { class: 'tu-row' },
            e('button', { class: 'tu-btn primary', disabled: busy.value, onClick: save }, host.t('save')),
            e('button', { class: 'tu-btn', onClick: props.onClose }, host.t('cancel')),
            props.lesson && props.onEntry ? e('button', { class: 'tu-btn', onClick: () => props.onEntry(props.lesson) }, '📓 ' + host.t('lesson_journal')) : null,
            e('span', { class: 'tu-grow' }),
            props.lesson ? e('button', { class: 'tu-btn danger', onClick: () => remove(false) }, host.t('delete')) : null,
            props.lesson?.series_id ? e('button', { class: 'tu-btn danger', onClick: () => remove(true) }, host.t('delete_series')) : null),
          student && student.debt > 0 ? e('div', { class: 'tu-warn' }, '💳 ' + fmt(host.t('lesson_debt'), { sum: money(host, student.debt) })) : null))
    }
  },
})

/** The lesson card with its follow-up journal card: shared by the schedule and the dashboard. */
export function useLessonLayer(host, office) {
  const modal = ref(null)
  const entry = ref(null)
  const open = (lesson, defaults) => { entry.value = null; modal.value = { lesson: lesson || null, defaults: defaults || {}, key: Math.random() } }
  const close = () => { modal.value = null }
  const toEntry = l => { modal.value = null; entry.value = { key: Math.random(), defaults: { student_id: Number(l.student_id), lesson_id: Number(l.id), subject_id: l.subject_id ?? null, entry_date: l.lesson_date } } }
  const view = () => [
    modal.value ? e(LessonModal, { key: modal.value.key, host, office, lesson: modal.value.lesson, defaults: modal.value.defaults, onClose: close, onEntry: toEntry }) : null,
    entry.value ? e(EntryModal, { key: entry.value.key, host, office, entry: null, defaults: entry.value.defaults, onClose: () => { entry.value = null } }) : null,
  ]
  return { open, view }
}

// ---------------------------------------------------------------- schedule page
const VIEWS = ['day', 'week', 'month', 'list']
let savedView = 'week'
try { savedView = globalThis.localStorage?.getItem('tu.view') || 'week' } catch { /* storage is optional */ }

export const pill = (host, office, l, onOpen, drag) => e('div', {
  key: l.id, class: 'tu-ev' + (['cancelled_tutor', 'cancelled_student', 'rescheduled'].includes(l.status) ? ' dim' : '') + (l.status === 'done' ? ' done' : ''),
  style: `--cc:${office.colorOf(l)}`, draggable: !!drag, title: `${hm(l.lesson_time)} · ${office.nameOf(l.student_id)} · ${host.t('lesson_' + l.status)}`,
  onDragstart: drag ? ev => { ev.dataTransfer.setData('text/plain', String(l.id)); ev.dataTransfer.effectAllowed = 'move' } : undefined,
  onClick: ev => { ev.stopPropagation(); onOpen(l) },
}, `${hm(l.lesson_time)} ${office.nameOf(l.student_id)}`)

export const SchedulePage = makePage('nav_schedule', ({ host, office }) => {
  const view = ref(VIEWS.includes(savedView) ? savedView : 'week')
  watch(view, v => { try { globalThis.localStorage?.setItem('tu.view', v) } catch { /* ignore */ } })
  const anchor = ref(todayStr())
  const student = ref('')
  const over = ref('')
  const layer = useLessonLayer(host, office)
  const open = layer.open
  const step = dir => {
    if (view.value === 'month') anchor.value = shiftYm(anchor.value.slice(0, 7), dir) + '-01'
    else anchor.value = addDays(anchor.value, dir * (view.value === 'day' ? 1 : view.value === 'week' ? 7 : 14))
  }

  async function drop(ev, date, time) {
    ev.preventDefault(); over.value = ''
    const id = ev.dataTransfer.getData('text/plain')
    const l = office.lessons.value.find(x => String(x.id) === id)
    if (!l || (l.lesson_date === date && (!time || hm(l.lesson_time) === time))) return
    await office.run(Q.reschedule, { id: l.id, date, time: time || hm(l.lesson_time), note: null }, 'rescheduled')
  }
  const dropProps = (key, date, time) => ({
    onDragover: ev => { ev.preventDefault(); over.value = key }, onDragleave: () => { if (over.value === key) over.value = '' }, onDrop: ev => drop(ev, date, time),
  })

  const visible = computed(() => office.lessons.value.filter(l => !student.value || String(l.student_id) === student.value))
  const holidays = computed(() => new Set(String(office.settings.value.holidays || '').split(',').map(x => x.trim()).filter(Boolean)))
  const workDays = computed(() => new Set(String(office.settings.value.work_days || '').split(',')))
  const isOff = date => holidays.value.has(date) || !workDays.value.has(String(isoWeekday(date)))

  const titleOf = () => {
    if (view.value === 'month') return monthTitle(host, anchor.value.slice(0, 7))
    if (view.value === 'day') return dayTitle(host, anchor.value)
    if (view.value === 'week') { const s = weekStart(anchor.value); return dayTitle(host, s, false) + ' – ' + dayTitle(host, addDays(s, 6), false) }
    return host.t('view_list_title')
  }

  function timeGrid(days) {
    const cfg = office.settings.value
    let from = Number(String(cfg.work_from).slice(0, 2)) || 9
    let to = Math.ceil(Number(String(cfg.work_to).slice(0, 2)) + Number(String(cfg.work_to).slice(3, 5)) / 60) || 21
    const set = new Set(days)
    visible.value.filter(l => set.has(l.lesson_date)).forEach(l => { const h = Number(hm(l.lesson_time).slice(0, 2)); from = Math.min(from, h); to = Math.max(to, h + 1) })
    const hours = []
    for (let h = from; h < Math.max(to, from + 1); h++) hours.push(h)
    const today = todayStr()
    const wd = weekdays(host)
    return e('div', { class: 'tu-week', style: `grid-template-columns:54px repeat(${days.length},minmax(0,1fr))` },
      e('div', { class: 'hd' }),
      days.map(d => e('div', { key: d, class: 'hd' + (d === today ? ' today' : '') + (isOff(d) ? ' off' : ''), onClick: () => { anchor.value = d; view.value = 'day' } },
        wd[isoWeekday(d) - 1], ' ', e('b', null, d.slice(8)))),
      hours.map(h => [
        e('div', { class: 'tm', key: 'h' + h }, String(h).padStart(2, '0') + ':00'),
        days.map(d => {
          const here = visible.value.filter(l => l.lesson_date === d && Number(hm(l.lesson_time).slice(0, 2)) === h)
          const key = d + h
          return e('div', { key, class: 'sl' + (isOff(d) ? ' off' : '') + (over.value === key ? ' over' : ''), ...dropProps(key, d, String(h).padStart(2, '0') + ':' + (here[0] ? hm(here[0].lesson_time).slice(3) : '00')), onClick: () => open(null, { lesson_date: d, lesson_time: String(h).padStart(2, '0') + ':00' }) },
            here.map(l => pill(host, office, l, open, true)))
        }),
      ]))
  }

  function monthGrid() {
    const ym = anchor.value.slice(0, 7)
    const first = ym + '-01'
    const start = weekStart(first)
    const cells = [...Array(42)].map((_, i) => addDays(start, i))
    const today = todayStr()
    return e('div', { class: 'tu-cal' },
      weekdays(host).map(w => e('div', { class: 'wd', key: w }, w)),
      cells.map(d => {
        const items = visible.value.filter(l => l.lesson_date === d)
        return e('div', { key: d, class: 'cell' + (d.slice(0, 7) !== ym ? ' out' : '') + (d === today ? ' today' : '') + (over.value === d ? ' over' : ''), ...dropProps(d, d, null), onClick: () => open(null, { lesson_date: d }) },
          e('div', { class: 'n' }, e('b', null, Number(d.slice(8))), isOff(d) ? e('span', { title: host.t('conf_day_off') }, '·') : null),
          items.slice(0, 3).map(l => pill(host, office, l, open, true)),
          items.length > 3 ? e('div', { class: 'tu-hint' }, '+' + (items.length - 3)) : null)
      }))
  }

  function listView() {
    const today = todayStr()
    const items = visible.value.filter(l => l.lesson_date >= today && UPCOMING.includes(l.status))
    const byDay = new Map()
    items.forEach(l => byDay.set(l.lesson_date, [...(byDay.get(l.lesson_date) || []), l]))
    return e('div', { class: 'tu-card' }, items.length
      ? [...byDay.entries()].slice(0, 30).map(([day, list]) => [e('div', { class: 'tu-day', key: day }, dayTitle(host, day)),
        e('div', { class: 'tu-list', key: day + 'l' }, list.map(l => e('div', { class: 'tu-item', key: l.id, onClick: () => open(l) },
          e('span', { class: 'tu-dot', style: `background:${office.colorOf(l)}` }),
          e('div', { class: 'm' }, e('b', null, `${hm(l.lesson_time)}–${endTime(l.lesson_time, l.duration)} · ${office.nameOf(l.student_id)}`), e('span', null, [office.subjectById.value.get(Number(l.subject_id))?.name, host.t('format_' + l.format), l.place].filter(Boolean).join(' · '))),
          LessonChip(host, l.status))))])
      : e('div', { class: 'tu-empty' }, e('div', { class: 'big' }, '📅'), e('p', null, host.t('schedule_empty'))))
  }

  return () => {
    const days = view.value === 'day' ? [anchor.value] : [...Array(7)].map((_, i) => addDays(weekStart(anchor.value), i))
    return {
      actions: e('button', { class: 'tu-btn primary', onClick: () => open(null, view.value === 'month' || view.value === 'list' ? {} : { lesson_date: anchor.value }) }, '+ ' + host.t('lesson_new')),
      content: e('div', { class: 'tu-grid' },
        e('div', { class: 'tu-filters' },
          view.value !== 'list' ? [e('button', { class: 'tu-btn sm', onClick: () => step(-1) }, '‹'), e('button', { class: 'tu-btn sm', onClick: () => { anchor.value = todayStr() } }, host.t('today')), e('button', { class: 'tu-btn sm', onClick: () => step(1) }, '›'), e('b', { style: 'min-width:150px' }, titleOf())] : e('b', null, titleOf()),
          e('div', { class: 'tu-seg' }, VIEWS.map(v => e('button', { key: v, class: view.value === v ? 'on' : '', onClick: () => { view.value = v } }, host.t('view_' + v)))),
          e('select', { class: 'tu-select', value: student.value, onChange: ev => { student.value = ev.target.value } }, e('option', { value: '' }, host.t('all_students')), office.students.value.map(s => e('option', { key: s.id, value: s.id }, s.name)))),
        view.value === 'month' ? monthGrid() : view.value === 'list' ? listView() : timeGrid(days)),
      modal: layer.view(),
    }
  }
})
