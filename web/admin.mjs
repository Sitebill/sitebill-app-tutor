// Admin pages of the Tutor's Office. Key = page path relative to /admin/x/rumantic.tutor/
import { Overview, SettingsPage, AgentPage, MiniDashboard } from './pages.mjs'
import { SchedulePage } from './lessons.mjs'
import { StudentsPage } from './students.mjs'
import { JournalPage, HomeworkPage, PaymentsPage } from './work.mjs'

export const pages = { '': Overview, schedule: SchedulePage, students: StudentsPage, journal: JournalPage, homework: HomeworkPage, payments: PaymentsPage, settings: SettingsPage, agent: AgentPage }

// Component names from manifest.json: admin.widgets and shell.adminDashboard.
export const widgets = { TutorDashboard: MiniDashboard }
