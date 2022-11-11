export const Logger = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  info: (...text: any[]) => console.info(`[scheduler] -`, ...text),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  warn: (...text: any[]) => console.warn(`[scheduler] -`, ...text),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: (...text: any[]) => console.error(`[scheduler] -`, ...text)
};
