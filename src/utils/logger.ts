/* eslint-disable @typescript-eslint/no-explicit-any */
export const logger = {
  log(...args: any[]) {
    const improvedArgs = args.map(arg => {
      if (typeof arg === 'object') {
        return JSON.stringify(arg)
      }
      return arg
    })
    console.log(...improvedArgs)
  },
  error(...args: any[]) {
    const improvedArgs = args.map(arg => {
      if (typeof arg === 'object') {
        return JSON.stringify(arg)
      }
      return arg
    })
    console.error(...improvedArgs)
  },
  warn(...args: any[]) {
    const improvedArgs = args.map(arg => {
      if (typeof arg === 'object') {
        return JSON.stringify(arg)
      }
      return arg
    })
    console.warn(...improvedArgs)
  },
}
