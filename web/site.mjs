// Public site of the Tutor's Office: the home page (shell.home). Guests see the landing, the owner sees the overview.
import { e, defineComponent, injectCss } from './core.mjs'
import { Overview } from './pages.mjs'

const Home = defineComponent({
  name: 'TuHome',
  props: { host: { type: Object, required: true } },
  setup(props) {
    const { host } = props
    injectCss()
    return () => {
      if (host.user) return e(Overview, { host })
      return e('div', { class: 'tu tu-landing' },
        e('div', { class: 'tu-lhero' },
          e('div', null, e('h1', null, host.t('landing_title')), e('p', null, host.t('landing_sub')),
            e('a', { class: 'tu-cta', href: host.localePath('/auth/login') }, host.t('landing_cta') + ' →')),
          e('div', { class: 'tu-mock' },
            e('div', { style: 'opacity:.75;font-size:13px' }, host.t('landing_mock_title')),
            e('div', { class: 'r' }, e('span', null, '🕘 ' + host.t('landing_mock_1')), e('em', null, host.t('lesson_confirmed'))),
            e('div', { class: 'r' }, e('span', null, '📒 ' + host.t('landing_mock_2')), e('em', null, host.t('lesson_done'))),
            e('div', { class: 'r' }, e('span', null, '📝 ' + host.t('landing_mock_3')), e('em', null, host.t('hw_submitted'))),
            e('div', { class: 'r' }, e('span', null, '💳 ' + host.t('landing_mock_4')), e('em', null, host.t('pay_paid'))))),
        e('div', { class: 'tu-feat' },
          [['🗓️', 'landing_f1_t', 'landing_f1_d'], ['📒', 'landing_f2_t', 'landing_f2_d'], ['✨', 'landing_f3_t', 'landing_f3_d']].map(([ic, t, d]) =>
            e('div', { class: 'tu-card', key: t }, e('div', { class: 'ic' }, ic), e('h3', null, host.t(t)), e('p', null, host.t(d))))))
    }
  },
})

export const widgets = { TutorHome: Home }
