interface URL {
  createObjectURL(object: any, options?: ObjectU): string
  revokeObjectURL(url: string): void
}

interface window {
  URL: URL
}
