// Shared core of the Tutor's Office app. Plain ESM, no build step: Vue comes from the host.
// Own CSS is injected once (the host's Tailwind only knows the classes of the platform itself) and is built on the
// host's theme variables, so it follows light/dark mode automatically.
const { defineComponent, h, ref, reactive, computed, onMounted, onBeforeUnmount, watch } = globalThis.__SB_HOST__.vue

export { defineComponent, h, ref, reactive, computed, onMounted, onBeforeUnmount, watch }

export const e = (tag, props, ...kids) => {
  const list = kids.flat(Infinity).filter(k => k !== null && k !== undefined && k !== false)
  // components get their children as a default slot
  return typeof tag === 'object' ? h(tag, props, { default: () => list }) : h(tag, props, list)
}

// ---------------------------------------------------------------- styles
const CSS = `
.tu{--c-bg:var(--ui-bg,#fff);--c-card:var(--ui-bg-elevated,var(--ui-bg,#fff));--c-line:var(--ui-border,#e5e7eb);--c-text:var(--ui-text,#111827);--c-muted:var(--ui-text-muted,#6b7280);--c-brand:#4f46e5;--c-brand2:#0ea5e9;--c-bad:#ef4444;--c-warn:#f59e0b;--c-ok:#10b981;
  color:var(--c-text);max-width:1240px;margin:0 auto;padding:8px 0 40px;font-size:14px;line-height:1.5}
.tu *{box-sizing:border-box}
.tu h1,.tu h2,.tu h3,.tu p{margin:0}
.tu-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}
.tu-title{font-size:26px;font-weight:700;letter-spacing:-.02em}
.tu-sub{color:var(--c-muted)}
.tu-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.tu-grow{flex:1}
.tu-grid{display:grid;gap:16px}
.tu-g4{grid-template-columns:repeat(4,minmax(0,1fr))}
.tu-g2{grid-template-columns:repeat(2,minmax(0,1fr))}
.tu-main{grid-template-columns:minmax(0,1.25fr) minmax(0,1fr)}
@media(max-width:960px){.tu-g4{grid-template-columns:repeat(2,minmax(0,1fr))}.tu-main,.tu-g2{grid-template-columns:minmax(0,1fr)}}
@media(max-width:520px){.tu-g4{grid-template-columns:minmax(0,1fr)}}
.tu-card{background:var(--c-card);border:1px solid var(--c-line);border-radius:18px;padding:18px 20px}
.tu-card h2{font-size:15px;font-weight:650;margin-bottom:12px;display:flex;align-items:center;gap:8px;justify-content:space-between}
.tu-card h2 small{font-weight:500;color:var(--c-muted);font-size:12.5px}
.tu-kpi .k{color:var(--c-muted);font-size:12.5px}
.tu-kpi .v{font-size:30px;font-weight:750;letter-spacing:-.03em;line-height:1.15}
.tu-kpi .d{color:var(--c-muted);font-size:12.5px;margin-top:2px}
.tu-ring{--p:0;width:64px;height:64px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(var(--c-brand) calc(var(--p)*1%),var(--c-line) 0);flex:none}
.tu-ring span{width:48px;height:48px;border-radius:50%;background:var(--c-card);display:grid;place-items:center;font-weight:750;font-size:14px}
.tu-btn{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--c-line);background:var(--c-card);color:var(--c-text);border-radius:12px;padding:8px 14px;font:inherit;font-weight:600;cursor:pointer;transition:.15s;white-space:nowrap}
.tu-btn:hover{border-color:var(--c-brand)}
.tu-btn.primary{background:linear-gradient(135deg,var(--c-brand),var(--c-brand2));border-color:transparent;color:#fff;box-shadow:0 8px 18px -8px rgba(79,70,229,.8)}
.tu-btn.primary:hover{filter:brightness(1.07)}
.tu-btn.danger:hover{border-color:var(--c-bad);color:var(--c-bad)}
.tu-btn.sm{padding:4px 10px;font-size:12.5px;border-radius:9px}
.tu-btn.ghost{border-color:transparent;background:none}
.tu-btn:disabled{opacity:.55;cursor:default}
.tu-input,.tu-select,.tu-area{width:100%;border:1px solid var(--c-line);background:var(--c-bg);color:var(--c-text);border-radius:11px;padding:8px 12px;font:inherit}
.tu-area{min-height:150px;resize:vertical;line-height:1.5}
.tu-input:focus,.tu-select:focus,.tu-area:focus{outline:2px solid var(--c-brand);outline-offset:-1px}
.tu-label{display:flex;flex-direction:column;gap:5px;font-size:12.5px;color:var(--c-muted);font-weight:600}
.tu-two{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.tu-three{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
@media(max-width:640px){.tu-two,.tu-three{grid-template-columns:minmax(0,1fr)}}
.tu-filters{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;align-items:center}
.tu-filters .tu-input,.tu-filters .tu-select{width:auto;min-width:150px}
.tu-seg{display:inline-flex;gap:3px;background:var(--c-line);padding:3px;border-radius:12px}
.tu-seg button{border:0;background:none;color:var(--c-text);padding:6px 12px;border-radius:9px;font:inherit;font-weight:650;cursor:pointer}
.tu-seg button.on{background:var(--c-card);box-shadow:0 1px 4px rgba(0,0,0,.15)}
.tu-chip{display:inline-flex;align-items:center;gap:5px;border-radius:99px;padding:2px 10px;font-size:12px;font-weight:650;white-space:nowrap;background:color-mix(in srgb,var(--cc,#64748b) 16%,transparent);color:var(--cc,#64748b)}
.tu-chip i{width:7px;height:7px;border-radius:50%;background:var(--cc,#64748b);display:inline-block}
.tu-dot{width:10px;height:10px;border-radius:50%;display:inline-block;flex:none}
.tu-ch{display:inline-flex;align-items:center;gap:4px;font-size:11.5px;border-radius:8px;padding:1px 7px;border:1px solid var(--c-line);color:var(--c-muted)}
.tu-ch.published{border-color:transparent;background:color-mix(in srgb,var(--c-ok) 18%,transparent);color:var(--c-ok)}
.tu-ch.in_work,.tu-ch.scheduled{border-color:transparent;background:color-mix(in srgb,var(--c-warn) 18%,transparent);color:#b45309}
.tu-ch.skipped{text-decoration:line-through;opacity:.6}
.tu-tbl{width:100%;border-collapse:collapse}
.tu-tbl th{text-align:left;font-size:12px;font-weight:650;color:var(--c-muted);padding:8px 10px;border-bottom:1px solid var(--c-line);white-space:nowrap}
.tu-tbl td{padding:10px;border-bottom:1px solid var(--c-line);vertical-align:middle}
.tu-tbl tr.click{cursor:pointer}.tu-tbl tr.click:hover td{background:color-mix(in srgb,var(--c-brand) 6%,transparent)}
.tu-tbl .t b{font-weight:650;display:block}.tu-tbl .t span{color:var(--c-muted);font-size:12.5px}
.tu-tbl-wrap{overflow:auto}
.tu-list{display:flex;flex-direction:column}
.tu-item{display:flex;align-items:center;gap:12px;padding:10px 0;border-top:1px solid var(--c-line);cursor:pointer}
.tu-item:first-child{border-top:0}
.tu-item .m{flex:1;min-width:0}
.tu-item .m b{display:block;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tu-item .m span{color:var(--c-muted);font-size:12.5px}
.tu-day{font-size:12px;font-weight:700;color:var(--c-muted);text-transform:uppercase;letter-spacing:.04em;margin:12px 0 2px}
.tu-day:first-child{margin-top:0}
.tu-empty{text-align:center;padding:30px 12px;color:var(--c-muted)}
.tu-empty .big{font-size:40px;margin-bottom:6px}
.tu-empty h3{color:var(--c-text);font-size:17px;margin-bottom:6px}
.tu-empty p{max-width:460px;margin:0 auto 16px}
.tu-note{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border-radius:12px;background:color-mix(in srgb,var(--cc,#64748b) 11%,transparent);border-left:3px solid var(--cc,#64748b);margin-top:8px;cursor:default}
.tu-note.click{cursor:pointer}
.tu-note b{display:block;font-weight:650}
.tu-note span{color:var(--c-muted);font-size:13px}
.tu-board{display:flex;gap:12px;overflow:auto;padding-bottom:10px;align-items:flex-start}
.tu-col{flex:0 0 250px;background:color-mix(in srgb,var(--c-line) 35%,transparent);border-radius:16px;padding:10px;min-height:120px}
.tu-col.over{outline:2px dashed var(--c-brand)}
.tu-col h3{font-size:13px;font-weight:700;display:flex;align-items:center;gap:7px;margin:2px 4px 10px}
.tu-col h3 em{margin-left:auto;font-style:normal;color:var(--c-muted);font-weight:600}
.tu-cardx{background:var(--c-card);border:1px solid var(--c-line);border-radius:13px;padding:10px 12px;margin-bottom:8px;cursor:grab;display:flex;flex-direction:column;gap:6px}
.tu-cardx:hover{border-color:var(--c-brand)}
.tu-cardx b{font-weight:650;line-height:1.3}
.tu-cardx small{color:var(--c-muted);font-size:12px}
.tu-cal{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:1px;background:var(--c-line);border:1px solid var(--c-line);border-radius:16px;overflow:hidden}
.tu-cal .wd{background:var(--c-card);padding:8px;font-size:12px;font-weight:700;color:var(--c-muted);text-align:center;text-transform:uppercase}
.tu-cal .cell{background:var(--c-card);min-height:104px;padding:6px;display:flex;flex-direction:column;gap:3px;cursor:pointer}
.tu-cal .cell:hover{background:color-mix(in srgb,var(--c-brand) 5%,var(--c-card))}
.tu-cal .cell.out{opacity:.45}
.tu-cal .cell.over{outline:2px dashed var(--c-brand);outline-offset:-2px}
.tu-cal .cell .n{font-size:12px;font-weight:650;color:var(--c-muted);display:flex;justify-content:space-between}
.tu-cal .cell.today .n b{background:var(--c-brand);color:#fff;border-radius:99px;padding:0 7px}
.tu-ev{font-size:11.5px;line-height:1.25;border-radius:7px;padding:2px 6px;background:color-mix(in srgb,var(--cc,#64748b) 17%,transparent);border-left:3px solid var(--cc,#64748b);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:grab}
@media(max-width:700px){.tu-cal .cell{min-height:64px}.tu-ev{font-size:10px;padding:1px 3px}}
.tu-ov{position:fixed;inset:0;background:rgba(15,23,42,.55);backdrop-filter:blur(3px);display:grid;place-items:center;z-index:200;padding:16px;max-width:none}
.tu-modal{width:100%;max-width:760px;background:var(--c-card);border:1px solid var(--c-line);border-radius:20px;padding:22px;display:flex;flex-direction:column;gap:14px;box-shadow:0 30px 80px -20px rgba(0,0,0,.5);max-height:92vh;overflow:auto}
.tu-modal.sm{max-width:480px}
.tu-modal h2{font-size:18px;margin:0;display:flex;justify-content:space-between;align-items:center;gap:10px}
.tu-form{display:flex;flex-direction:column;gap:14px}
.tu-pl{display:grid;grid-template-columns:minmax(120px,1fr) 150px minmax(0,1.4fr);gap:8px;align-items:center;padding:8px 0;border-top:1px solid var(--c-line)}
@media(max-width:640px){.tu-pl{grid-template-columns:minmax(0,1fr)}}
.tu-tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
.tu-tile{display:flex;flex-direction:column;gap:8px}
.tu-tile .top{display:flex;align-items:center;gap:10px}
.tu-tile .top b{font-size:15px;flex:1}
.tu-tile p{color:var(--c-muted);white-space:pre-wrap}
.tu-tile .act{display:flex;gap:8px;margin-top:auto}
.tu-prop{border:1px dashed var(--c-line);border-radius:14px;padding:12px 14px;display:flex;flex-direction:column;gap:6px;margin-bottom:10px;background:color-mix(in srgb,var(--c-brand2) 4%,transparent)}
.tu-prop pre{white-space:pre-wrap;font:inherit;color:var(--c-muted);margin:0;max-height:140px;overflow:auto}
.tu-pick{display:flex;gap:6px;flex-wrap:wrap}
.tu-pick label{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--c-line);border-radius:10px;padding:4px 10px;cursor:pointer;font-size:13px;user-select:none}
.tu-pick label.on{border-color:var(--c-brand);background:color-mix(in srgb,var(--c-brand) 10%,transparent)}
.tu-pick input{display:none}
.tu-swatch{display:flex;gap:6px;flex-wrap:wrap}
.tu-swatch i{width:24px;height:24px;border-radius:50%;cursor:pointer;border:3px solid transparent;display:block}
.tu-swatch i.on{border-color:var(--c-text)}
.tu-deny{padding:60px 16px;text-align:center;color:var(--c-muted)}
.tu-loading{padding:60px;text-align:center;color:var(--c-muted)}
.tu-split{display:grid;grid-template-columns:260px minmax(0,1fr);gap:16px;align-items:start}
@media(max-width:860px){.tu-split{grid-template-columns:minmax(0,1fr)}}
.tu-proj{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:13px;cursor:pointer;border:1px solid transparent}
.tu-proj:hover{background:color-mix(in srgb,var(--c-brand) 6%,transparent)}
.tu-proj.on{border-color:var(--c-brand);background:color-mix(in srgb,var(--c-brand) 9%,transparent)}
.tu-proj b{display:block;font-weight:650;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tu-proj span{color:var(--c-muted);font-size:12.5px}
.tu-facts{display:grid;grid-template-columns:130px minmax(0,1fr);gap:6px 14px;font-size:13.5px}
.tu-facts dt{color:var(--c-muted)}.tu-facts dd{margin:0}
.tu-landing{padding:0 0 30px}
.tu-lhero{position:relative;overflow:hidden;border-radius:30px;padding:64px 40px;color:#fff;background:radial-gradient(1000px 480px at 90% -10%,rgba(99,102,241,.6),transparent 60%),radial-gradient(800px 500px at 0% 110%,rgba(45,212,191,.4),transparent 60%),linear-gradient(135deg,#1e1b4b,#3730a3 55%,#0e7490);display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:36px;align-items:center}
@media(max-width:860px){.tu-lhero{grid-template-columns:minmax(0,1fr);padding:40px 22px}}
.tu-lhero h1{font-size:clamp(34px,5vw,54px);line-height:1.05;letter-spacing:-.035em;font-weight:800;margin-bottom:16px}
.tu-lhero p{font-size:17px;opacity:.9;max-width:540px;margin-bottom:26px}
.tu-cta{display:inline-flex;gap:8px;align-items:center;background:#fff;color:#3730a3;font-weight:700;font-size:16px;padding:14px 26px;border-radius:15px;text-decoration:none;box-shadow:0 14px 30px -12px rgba(0,0,0,.5);transition:.15s}
.tu-cta:hover{transform:translateY(-2px)}
.tu-mock{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);border-radius:22px;padding:18px;backdrop-filter:blur(8px);display:flex;flex-direction:column;gap:10px;transform:rotate(1.5deg)}
.tu-mock .r{display:flex;justify-content:space-between;align-items:center;gap:10px;background:rgba(255,255,255,.13);border-radius:13px;padding:10px 14px;font-size:14px}
.tu-mock .r em{font-style:normal;font-size:11.5px;font-weight:700;border-radius:99px;padding:2px 9px;background:rgba(255,255,255,.22);white-space:nowrap}
.tu-feat{margin-top:22px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
@media(max-width:860px){.tu-feat{grid-template-columns:minmax(0,1fr)}}
.tu-feat .tu-card{padding:24px}
.tu-feat .ic{font-size:30px;margin-bottom:10px}
.tu-feat h3{font-size:17px;margin-bottom:6px}
.tu-feat p{color:var(--c-muted)}
.tu-mini{display:flex;flex-direction:column;gap:10px}
.tu-mini .big{font-size:28px;font-weight:750;letter-spacing:-.02em}
.tu-ava{width:34px;height:34px;border-radius:50%;display:inline-grid;place-items:center;color:#fff;font-weight:700;font-size:13px;flex:none}
.tu-ava.lg{width:56px;height:56px;font-size:20px}
.tu-tabs{display:flex;gap:4px;border-bottom:1px solid var(--c-line);margin:2px 0 4px;flex-wrap:wrap}
.tu-tabs button{border:0;background:none;color:var(--c-muted);padding:8px 14px;font:inherit;font-weight:650;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px}
.tu-tabs button.on{color:var(--c-text);border-color:var(--c-brand)}
.tu-modal.wide{max-width:980px}
.tu-week{display:grid;grid-template-columns:54px repeat(7,minmax(0,1fr));border:1px solid var(--c-line);border-radius:16px;overflow:hidden;background:var(--c-line);gap:1px}
.tu-week .hd{background:var(--c-card);padding:8px 6px;text-align:center;font-size:12px;font-weight:700;color:var(--c-muted);cursor:pointer}
.tu-week .hd.today b{background:var(--c-brand);color:#fff;border-radius:99px;padding:0 7px}
.tu-week .hd.off{opacity:.55}
.tu-week .tm{background:var(--c-card);font-size:11px;color:var(--c-muted);text-align:right;padding:2px 6px}
.tu-week .sl{background:var(--c-card);min-height:46px;padding:2px;display:flex;flex-direction:column;gap:2px;cursor:pointer}
.tu-week .sl:hover{background:color-mix(in srgb,var(--c-brand) 6%,var(--c-card))}
.tu-week .sl.off{background:color-mix(in srgb,var(--c-line) 40%,var(--c-card))}
.tu-week .sl.over{outline:2px dashed var(--c-brand);outline-offset:-2px}
@media(max-width:760px){.tu-week{grid-template-columns:38px repeat(7,minmax(70px,1fr));overflow:auto}}
.tu-ev.dim{opacity:.5;text-decoration:line-through}
.tu-ev.done{border-left-color:var(--c-ok)}
.tu-bar{height:8px;border-radius:99px;background:var(--c-line);overflow:hidden}
.tu-bar i{display:block;height:100%;background:var(--c-brand);border-radius:99px}
.tu-money.bad{color:var(--c-bad);font-weight:700}.tu-money.ok{color:var(--c-ok);font-weight:700}
.tu-stars{letter-spacing:2px;color:var(--c-warn)}
.tu-mono{white-space:pre-wrap;font:inherit;background:color-mix(in srgb,var(--c-line) 30%,transparent);border-radius:12px;padding:12px 14px;margin:0;max-height:320px;overflow:auto}
.tu-hint{font-size:12.5px;color:var(--c-muted)}
.tu-warn{display:flex;gap:8px;align-items:flex-start;padding:8px 12px;border-radius:11px;background:color-mix(in srgb,var(--c-warn) 14%,transparent);color:#92400e;font-size:13px}
@media (prefers-color-scheme: dark){.tu-warn{color:#fcd34d}}
`

let cssDone = false
export function injectCss() {
  if (cssDone || typeof document === 'undefined') return
  cssDone = true
  const s = document.createElement('style')
  s.id = 'tu-css'
  s.textContent = CSS
  document.head.appendChild(s)
}

// ---------------------------------------------------------------- constants
export const STUDENT_STATUSES = ['new', 'active', 'paused', 'finished', 'archived']
export const STUDENT_COLOR = { new: '#0ea5e9', active: '#10b981', paused: '#f59e0b', finished: '#64748b', archived: '#94a3b8' }
export const LESSON_STATUSES = ['planned', 'confirmed', 'done', 'cancelled_tutor', 'cancelled_student', 'no_show', 'rescheduled']
export const LESSON_COLOR = { planned: '#64748b', confirmed: '#0ea5e9', done: '#10b981', cancelled_tutor: '#ef4444', cancelled_student: '#f97316', no_show: '#a855f7', rescheduled: '#f59e0b' }
export const HW_STATUSES = ['issued', 'in_progress', 'submitted', 'done', 'checked', 'rework']
export const HW_COLOR = { issued: '#64748b', in_progress: '#0ea5e9', submitted: '#a855f7', done: '#14b8a6', checked: '#10b981', rework: '#f59e0b', overdue: '#ef4444' }
export const COLORS = ['#4f46e5', '#0d9488', '#f59e0b', '#ef4444', '#0ea5e9', '#ec4899', '#8b5cf6', '#10b981']
export const SEVERITY_COLOR = { bad: '#ef4444', warn: '#f59e0b', info: '#0ea5e9' }
/** Statuses of lessons that are still ahead of the tutor. */
export const UPCOMING = ['planned', 'confirmed']
const CURRENCY = { ru: 'RUB', en: 'USD', sr: 'RSD', tg: 'TJS' }

// ---------------------------------------------------------------- helpers
export const loc = host => String((host.locale && typeof host.locale === 'object' ? host.locale.value : host.locale) || 'en')
const pad = n => String(n).padStart(2, '0')
export const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const todayStr = () => iso(new Date())
const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
export const addDays = (s, n) => { const [y, m, d] = s.split('-').map(Number); return iso(new Date(y, m - 1, d + n)) }
/** Monday of the week of the date. */
export const weekStart = s => { const d = parse(s); return addDays(s, -((d.getDay() + 6) % 7)) }
export const isoWeekday = s => ((parse(s).getDay() + 6) % 7) + 1
export const ymOf = s => String(s).slice(0, 7)
export const shiftYm = (ym, delta) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + delta, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}` }
export const monthTitle = (host, ym) => { const [y, m] = ym.split('-').map(Number); return new Intl.DateTimeFormat(loc(host), { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1)) }
export const dayTitle = (host, s, withWeekday = true) => new Intl.DateTimeFormat(loc(host), withWeekday ? { weekday: 'short', day: 'numeric', month: 'long' } : { day: 'numeric', month: 'short' }).format(parse(s))
/** Short weekday names, Monday first. */
export const weekdays = host => { const base = new Date(2024, 0, 1); return [...Array(7)].map((_, i) => new Intl.DateTimeFormat(loc(host), { weekday: 'short' }).format(new Date(base.getFullYear(), 0, 1 + i))) }
export const money = (host, n) => {
  const l = loc(host).slice(0, 2)
  try { return new Intl.NumberFormat(l, { style: 'currency', currency: CURRENCY[l] || 'USD', maximumFractionDigits: 0 }).format(Number(n) || 0) } catch { return String(n) }
}
export const fmt = (text, vars = {}) => Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), text)
export const hm = t => String(t || '').slice(0, 5)
export const endTime = (t, minutes) => { const [h, m] = hm(t).split(':').map(Number); const total = h * 60 + m + Number(minutes || 0); return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}` }
export const initials = name => String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
export const lines = text => String(text || '').split(/\r?\n/).map(x => x.trim()).filter(Boolean)
export const isChargedStatus = s => s === 'done' || s === 'no_show'
export const isOverdueHw = (h, today = todayStr()) => !!h.is_overdue || (['issued', 'in_progress', 'rework'].includes(h.status) && !!h.due_on && h.due_on < today)
export const hwShown = (h, today = todayStr()) => (isOverdueHw(h, today) ? 'overdue' : h.status)
/** A readable text for the details of a review item: name|value|value... */
export const parts = meta => String(meta || '').split('|')

// ---------------------------------------------------------------- GraphQL documents
const STUDENT = 'id name birth_date grade school phone email subject_id started_on format price duration goal level desired_result strengths weaknesses focus_topics wishes notes status lessons_done lessons_paid balance debt next_lesson_date next_lesson_time last_lesson_date'
const LESSON = 'id student_id subject_id series_id lesson_date lesson_time duration format place price status comment moves'
const ENTRY = 'id student_id lesson_id subject_id entry_date topic material exercises results difficulties homework_text comment score links'
const HW = 'id student_id subject_id lesson_id topic body issued_on due_on status is_overdue comment links'
export const Q = {
  subjects: 'query { tutorSubjects { id name category description program topics price color } }',
  students: `query { tutorStudents { ${STUDENT} } }`,
  lessons: `query { tutorLessons(limit: 3000) { ${LESSON} } }`,
  settings: 'query { tutorSettings { work_days work_from work_to default_price default_duration holidays tutor_name } }',
  guardians: 'query($student_id: Int) { tutorGuardians(student_id: $student_id) { id student_id name relation phone email } }',
  moves: 'query($lesson_id: Int!) { tutorLessonMoves(lesson_id: $lesson_id) { id from_date from_time to_date to_time note created_at } }',
  entries: `query($student_id: Int, $search: String, $from: String, $to: String) { tutorEntries(student_id: $student_id, search: $search, from: $from, to: $to, limit: 500) { ${ENTRY} } }`,
  homework: `query($student_id: Int, $today: String) { tutorHomework(student_id: $student_id, today: $today) { ${HW} } }`,
  payments: 'query($student_id: Int) { tutorPayments(student_id: $student_id) { id student_id paid_on amount lessons_count note } }',
  review: 'query($today: String) { tutorReview(today: $today) { code severity student_id lesson_id homework_id meta } }',
  conflicts: 'query($date: String!, $time: String!, $duration: Int, $exclude_id: Int) { tutorConflicts(date: $date, time: $time, duration: $duration, exclude_id: $exclude_id) { code lesson_id meta } }',
  slots: 'query($date: String!, $duration: Int, $days: Int) { tutorFreeSlots(date: $date, duration: $duration, days: $days) { date time } }',
  draft: 'query($student_id: Int!, $topic: String, $count: Int, $locale: String) { tutorHomeworkDraft(student_id: $student_id, topic: $topic, count: $count, locale: $locale) { topic body } }',
  report: 'query($student_id: Int!, $from: String, $to: String, $with_money: Boolean, $locale: String) { tutorProgressReport(student_id: $student_id, from: $from, to: $to, with_money: $with_money, locale: $locale) { title body } }',
  saveSubject: 'mutation($id: ID, $input: TutorSubjectInput!) { tutorSaveSubject(id: $id, input: $input) { id } }',
  delSubject: 'mutation($id: ID!) { tutorDeleteSubject(id: $id) }',
  saveStudent: `mutation($id: ID, $input: TutorStudentInput!) { tutorSaveStudent(id: $id, input: $input) { ${STUDENT} } }`,
  delStudent: 'mutation($id: ID!) { tutorDeleteStudent(id: $id) }',
  saveGuardian: 'mutation($id: ID, $input: TutorGuardianInput!) { tutorSaveGuardian(id: $id, input: $input) { id } }',
  delGuardian: 'mutation($id: ID!) { tutorDeleteGuardian(id: $id) }',
  saveLesson: `mutation($id: ID, $input: TutorLessonInput!) { tutorSaveLesson(id: $id, input: $input) { ${LESSON} } }`,
  lessonStatus: `mutation($id: ID!, $status: String!) { tutorSetLessonStatus(id: $id, status: $status) { ${LESSON} } }`,
  reschedule: `mutation($id: ID!, $date: String!, $time: String!, $note: String) { tutorRescheduleLesson(id: $id, date: $date, time: $time, note: $note) { ${LESSON} } }`,
  delLesson: 'mutation($id: ID!, $series: Boolean) { tutorDeleteLesson(id: $id, series: $series) }',
  saveEntry: `mutation($id: ID, $input: TutorEntryInput!) { tutorSaveEntry(id: $id, input: $input) { ${ENTRY} } }`,
  delEntry: 'mutation($id: ID!) { tutorDeleteEntry(id: $id) }',
  saveHomework: `mutation($id: ID, $input: TutorHomeworkInput!) { tutorSaveHomework(id: $id, input: $input) { ${HW} } }`,
  hwStatus: `mutation($id: ID!, $status: String!) { tutorSetHomeworkStatus(id: $id, status: $status) { ${HW} } }`,
  delHomework: 'mutation($id: ID!) { tutorDeleteHomework(id: $id) }',
  savePayment: 'mutation($id: ID, $input: TutorPaymentInput!) { tutorSavePayment(id: $id, input: $input) { id } }',
  delPayment: 'mutation($id: ID!) { tutorDeletePayment(id: $id) }',
  saveSettings: 'mutation($input: TutorSettingsInput!) { tutorSaveSettings(input: $input) { work_days } }',
  seed: 'mutation($locale: String) { tutorSeedDemo(locale: $locale) }',
}

// ---------------------------------------------------------------- office store
export function useOffice(host) {
  injectCss()
  const subjects = ref([])
  const students = ref([])
  const lessons = ref([])
  const settings = ref({ work_days: '1,2,3,4,5,6', work_from: '09:00', work_to: '21:00', default_price: 0, default_duration: 60, holidays: '', tutor_name: '' })
  const loading = ref(true)
  const denied = ref(false)

  async function reload() {
    try {
      const [a, b, c, d] = await Promise.all([host.gql(Q.subjects), host.gql(Q.students), host.gql(Q.lessons), host.gql(Q.settings)])
      subjects.value = a.tutorSubjects
      students.value = b.tutorStudents
      lessons.value = c.tutorLessons
      settings.value = d.tutorSettings
      denied.value = false
    } catch {
      denied.value = true
    } finally {
      loading.value = false
    }
  }
  onMounted(reload)

  const subjectById = computed(() => new Map(subjects.value.map(s => [Number(s.id), s])))
  const studentById = computed(() => new Map(students.value.map(s => [Number(s.id), s])))
  const isEmpty = computed(() => !students.value.length && !subjects.value.length)

  async function run(query, vars, okKey = 'saved') {
    try {
      const data = await host.gql(query, vars)
      if (okKey) host.toast(host.t(okKey), 'success')
      await reload()
      return data
    } catch (err) {
      host.toast(String(err?.message || host.t('error')), 'error')
      return null
    }
  }
  const seed = () => run(Q.seed, { locale: loc(host).slice(0, 2) }, 'demo_loaded')
  const colorOf = l => subjectById.value.get(Number(l.subject_id))?.color || '#6366f1'
  const nameOf = id => studentById.value.get(Number(id))?.name || '?'

  return { subjects, students, lessons, settings, loading, denied, reload, subjectById, studentById, isEmpty, run, seed, colorOf, nameOf }
}

// ---------------------------------------------------------------- small views
export const Modal = defineComponent({
  name: 'TuModal',
  props: { title: String, small: Boolean, wide: Boolean, onClose: Function },
  setup(props, { slots }) {
    const onKey = ev => { if (ev.key === 'Escape') props.onClose?.() }
    onMounted(() => document.addEventListener('keydown', onKey))
    onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
    return () => e('div', { class: 'tu tu-ov', onClick: ev => { if (ev.target === ev.currentTarget) props.onClose?.() } },
      e('div', { class: 'tu-modal' + (props.small ? ' sm' : '') + (props.wide ? ' wide' : '') },
        e('h2', null, props.title, e('button', { class: 'tu-btn ghost sm', type: 'button', onClick: () => props.onClose?.() }, '✕')),
        slots.default?.()))
  },
})

export const Chip = (label, color) => e('span', { class: 'tu-chip', style: `--cc:${color || '#64748b'}` }, e('i'), label)
export const LessonChip = (host, s) => Chip(host.t('lesson_' + s), LESSON_COLOR[s])
export const StudentChip = (host, s) => Chip(host.t('student_' + s), STUDENT_COLOR[s])
export const HwChip = (host, s) => Chip(host.t('hw_' + s), HW_COLOR[s])
export const Avatar = (name, color) => e('span', { class: 'tu-ava', style: `background:${color || '#6366f1'}` }, initials(name))

export const Empty = (host, office) => e('div', { class: 'tu-card tu-empty' },
  e('div', { class: 'big' }, '🎓'), e('h3', null, host.t('empty_title')), e('p', null, host.t('demo_text')),
  e('button', { class: 'tu-btn primary', onClick: () => office.seed() }, '✨ ' + host.t('demo_button')))

export const Swatches = (value, set, list = COLORS) => e('div', { class: 'tu-swatch' }, list.map(c => e('i', { key: c, style: `background:${c}`, class: value === c ? 'on' : '', onClick: () => set(c) })))

/** A labelled field. */
export const Field = (label, input, cls) => e('label', { class: 'tu-label' + (cls ? ' ' + cls : '') }, label, input)
/** v-model for render functions: a reactive object and a key. */
export const bind = (obj, key, extra = {}) => ({ value: obj[key] ?? '', onInput: ev => { obj[key] = ev.target.value }, ...extra })
export const bindNum = (obj, key, extra = {}) => ({ value: obj[key] ?? '', onInput: ev => { obj[key] = ev.target.value === '' ? null : Number(ev.target.value) }, ...extra })
export const StudentSelect = (host, office, obj, key, opts = {}) => e('select', { class: 'tu-select', value: obj[key] ?? '', onChange: ev => { obj[key] = ev.target.value === '' ? null : Number(ev.target.value); opts.onPick?.(obj[key]) } },
  opts.blank ? e('option', { value: '' }, host.t(opts.blank)) : null,
  office.students.value.filter(s => opts.all || !['archived', 'finished'].includes(s.status) || Number(s.id) === Number(obj[key])).map(s => e('option', { key: s.id, value: s.id }, s.name)))
export const SubjectSelect = (host, office, obj, key, opts = {}) => e('select', { class: 'tu-select', value: obj[key] ?? '', onChange: ev => { obj[key] = ev.target.value === '' ? null : Number(ev.target.value); opts.onPick?.(obj[key]) } },
  e('option', { value: '' }, host.t(opts.blank || 'no_subject')),
  office.subjects.value.map(s => e('option', { key: s.id, value: s.id }, s.name)))

// ---------------------------------------------------------------- page frame
/** Common frame: loading, denied, empty office. `render` gets { host, office } and returns () => { actions, content, always }. */
export function makePage(titleKey, render) {
  return defineComponent({
    name: 'TuPage_' + titleKey,
    props: { host: Object },
    setup(props) {
      const host = props.host
      const office = useOffice(host)
      const body = render({ host, office })
      return () => {
        if (office.loading.value) return e('div', { class: 'tu tu-loading' }, host.t('loading'))
        if (office.denied.value) return e('div', { class: 'tu tu-deny' }, host.t('denied'))
        const r = body()
        return e('div', { class: 'tu' },
          e('div', { class: 'tu-head' },
            e('div', null, e('h1', { class: 'tu-title' }, host.t(titleKey)), r.sub ? e('p', { class: 'tu-sub' }, r.sub) : null),
            e('div', { class: 'tu-row' }, r.actions)),
          office.isEmpty.value && !r.always ? Empty(host, office) : r.content,
          r.modal || null)
      }
    },
  })
}
