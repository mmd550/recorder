let linkElement: HTMLAnchorElement | undefined

const getLinkEl = () => {
  if (linkElement) return linkElement

  const a = document.createElement('a') as HTMLAnchorElement
  a.style.display = 'none'
  document.body.appendChild(a)
  linkElement = a
  return linkElement
}

export function saveFile(blobList: Blob[], type: string, name = 'untitled') {
  return new Promise((resolve, reject) => {
    if (!('URL' in window))
      reject(
        new Error(
          'Unable to save the file. Browser doesn`t support window.URL',
        ),
      )
    else {
      let blob: Blob | undefined = new Blob(blobList, { type })
      const url = window.URL.createObjectURL(blob)

      const a = getLinkEl()
      a.href = url
      a.download = name
      a.click()

      setTimeout(() => {
        if ('URL' in window) window.URL.revokeObjectURL(url)
        blob = undefined
        resolve('File saved successfully')
      }, 100)
    }
  })
}
