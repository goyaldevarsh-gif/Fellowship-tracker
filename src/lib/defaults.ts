import type { AppData, Profile, Prefs } from '../types'

export const DEFAULT_PROFILE: Profile = {
  name: 'Dr. Devarsh Goyal',
  qualifications: 'MBBS — SMS Medical College, Jaipur\nMS Orthopaedics — SMS Medical College, Jaipur',
  experience: 'Senior Resident, Department of Orthopaedics, SMS Medical College, Jaipur (1 year post-MS)',
  research: '',
  surgical: '',
  preferences:
    'Primary: Sports Medicine & Arthroscopy fellowship. Secondary: Arthroplasty.\nLong-term goal: sports injury centre in Jaipur.',
  phone1: '+91-8949060654',
  phone2: '+91-7852860654',
  email: 'goyal.devarsh@gmail.com',
  updatedAt: 0,
}

export const DEFAULT_PREFS: Prefs = {
  templatesUpdatedAt: 0,
  templates: {
    whatsapp:
      'Good day {doctor}. I am Dr. Devarsh Goyal, MS Orthopaedics, currently Senior Resident at SMS Medical College, Jaipur, with 1 year of post-MS experience. I am interested in the Sports Medicine & Arthroscopy fellowship at {hospital}. I am sharing my CV and 2 LORs. Could you please let me know the application process, vacancy and eligibility?\nContact: +91-8949060654, +91-7852860654\nThank you.',
    emailSubject: 'Application for Sports Medicine & Arthroscopy Fellowship — Dr. Devarsh Goyal',
    emailBody:
      'Dear {doctor},\n\nI am Dr. Devarsh Goyal, MS Orthopaedics, currently working as Senior Resident at SMS Medical College, Jaipur, with 1 year of post-MS experience.\n\nI am keen to pursue the Sports Medicine & Arthroscopy fellowship at {hospital}. I am attaching my CV and 2 letters of recommendation. Kindly let me know the application process, vacancy and eligibility criteria.\n\nRegards,\nDr. Devarsh Goyal\nSenior Resident, Dept. of Orthopaedics\nSMS Medical College, Jaipur\n+91-8949060654, +91-7852860654',
  },
}

export const emptyData = (): AppData => ({
  version: 1, recs: [], docs: [], tasks: [], notes: [],
  profile: { ...DEFAULT_PROFILE }, prefs: JSON.parse(JSON.stringify(DEFAULT_PREFS)),
})
