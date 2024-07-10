export function saveFile(blobList: Blob[], type: string, name = 'untitled') {
  return new Promise((resolve, reject) => {
    if (!('URL' in window)) reject('Browser not Supported')
    else {
      const blob = new Blob(blobList, { type })
      const url = window.URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = name
      document.body.appendChild(a)
      a.click()

      setTimeout(() => {
        if ('URL' in window) window.URL.revokeObjectURL(url)

        document.body.removeChild(a)
        resolve('File saved successfully')
      }, 100)
    }
  })
}
