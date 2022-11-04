export const Logger = {
  info: (...text: any[]) => console.info(`[scheduler] -`, ...text),
  warn: (...text: any[]) => console.warn(`[scheduler] -`, ...text),
  error: (...text: any[]) => console.error(`[scheduler] -`, ...text)
};
