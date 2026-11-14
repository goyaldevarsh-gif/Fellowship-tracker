export type Kind = 'fellowship' | 'observership' | 'footankle'

export const STATUSES = [
  'Not started', 'Enquiry sent', 'CV mailed', 'Waiting for email id', 'Reply awaited', 'Replied',
  'Spoke on call', 'Applied', 'Exam / Interview', 'Offer', 'Rejected', 'Dropped', 'On hold',
] as const
export type Status = (typeof STATUSES)[number]

export interface Comm {
  id: string
  date: string // yyyy-mm-dd
  text: string
  channel?: 'call' | 'whatsapp' | 'email' | 'visit' | 'note' | 'status'
  source?: 'import' | 'app' | 'claude'
}

export interface DocLink {
  docId: string
  sent: boolean
  sentOn?: string
  via?: string
}

export interface Ratings {
  hands?: number; volume?: number; faculty?: number; research?: number; career?: number; overall?: number
  assessment?: string
}

export interface Rec {
  id: string
  kind: Kind
  sno: number | string
  tier?: number
  type?: string // F&A programme type
  area: string
  doctor: string
  hospital: string
  location: string
  duration: string
  phone: string
  email: string
  status: Status | string
  lastUpdate?: string
  nextStep: string
  followUp?: string
  remarks: string
  historyRaw: string // original Excel history text (preserved)
  seats: string
  stipend: string
  eligibility: string
  howToApply: string
  website: string
  notes: string // Excel 'Notes' / verified description
  tags: string[]
  comms: Comm[]
  statusLog: { id: string; from: string; to: string; date: string; remarks?: string }[]
  docLinks: DocLink[]
  ratings?: Ratings
  original?: Record<string, string> // untouched Excel row (as imported)
  importedAt?: string
  userEdited?: boolean
  updatedAt: number
  deleted?: boolean
}

export type DocCategory =
  | 'CV' | 'LOR' | 'SOP' | 'MBBS Certificate' | 'MS Certificate' | 'Internship Certificate'
  | 'Medical Registration' | 'Experience Certificates' | 'Research Publications'
  | 'Surgical Logbook' | 'Photograph' | 'Other Documents'
export const DOC_CATS: DocCategory[] = [
  'CV', 'LOR', 'SOP', 'MBBS Certificate', 'MS Certificate', 'Internship Certificate', 'Medical Registration',
  'Experience Certificates', 'Research Publications', 'Surgical Logbook', 'Photograph', 'Other Documents',
]

export interface DocVersion { fileId: string; name: string; size: number; mime: string; addedAt: number }
export interface Doc {
  id: string
  category: DocCategory | string
  title: string
  description: string
  final: boolean
  versions: DocVersion[] // last = current
  updatedAt: number
  deleted?: boolean
}

export interface Task {
  id: string
  title: string
  date: string
  time?: string
  type: 'task' | 'interview' | 'deadline' | 'joining' | 'call'
  done: boolean
  recId?: string
  updatedAt: number
  deleted?: boolean
}

export interface Note {
  id: string
  title: string
  body: string
  type: 'general' | 'institute' | 'doctor' | 'interview' | 'questions' | 'followup'
  recId?: string
  checklist: { id: string; text: string; done: boolean }[]
  updatedAt: number
  deleted?: boolean
}

export interface Profile {
  name: string
  qualifications: string
  experience: string
  research: string
  surgical: string
  preferences: string
  phone1: string
  phone2: string
  email: string
  updatedAt: number
}

export interface Templates {
  whatsapp: string
  emailSubject: string
  emailBody: string
}

export interface Prefs {
  templates: Templates
  templatesUpdatedAt: number
}

export interface AppData {
  version: 1
  recs: Rec[]
  docs: Doc[]
  tasks: Task[]
  notes: Note[]
  profile: Profile
  prefs: Prefs
  lastBackupAt?: number
}

export interface SyncConfig {
  repo: string // owner/name
  branch: string
  path: string // db.json
  token: string
  syncFiles: boolean
  auto: boolean
}
