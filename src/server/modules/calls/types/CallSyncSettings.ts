export interface CallSyncSettings {
  // How far back each company's history should reach.
  historyDays: number
  // How far back a monthly run re-reads, for sources that edit calls.
  resyncDays: number
}
