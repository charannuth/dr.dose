/** Canonical in-app routes — always use drawer shell or modals, never legacy (tabs). */
export const routes = {
  today: '/(drawer)/today',
  history: '/(drawer)/history',
  tracking: '/(drawer)/tracking',
  account: '/(drawer)/account',
  streaks: '/(drawer)/streaks',
  wellness: '/(drawer)/wellness',
  doctorVisits: '/(drawer)/doctor-visits',
  medicalRecords: '/(drawer)/medical-records',
  interactions: '/(drawer)/interactions',
  help: '/(drawer)/help',
  login: '/login',
  medicationNew: '/(modals)/medications/new',
  medicationEdit: (id: string) => `/(modals)/medications/${id}` as const,
} as const;
