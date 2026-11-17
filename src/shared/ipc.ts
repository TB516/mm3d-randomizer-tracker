/** Channel names shared by the main process and preload so the two cannot drift apart. */
export const channels = {
  watchTracker: 'watch-tracker',
  chooseSeed: 'choose-seed',
  restartTracking: 'restart-tracking'
} as const;
