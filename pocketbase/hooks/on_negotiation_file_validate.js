onRecordUpdateRequest((e) => {
  const companyId = e.record.get('company_id')
  if (!companyId) return e.next()

  const uploadedFiles = e.findUploadedFiles('arquivos')
  if (!uploadedFiles || uploadedFiles.length === 0) return e.next()

  const negs = $app.findRecordsByFilter('negotiations', `company_id = '${companyId}'`, '', 2000, 0)
  let totalSize = 0
  const fsys = $app.newFilesystem()

  try {
    for (const neg of negs) {
      const files = neg.getStringSlice('arquivos')
      const prefix = neg.baseFilesPath()
      for (const file of files) {
        try {
          totalSize += fsys.attributes(prefix + '/' + file).size
        } catch (_) {}
      }
    }
  } finally {
    fsys.close()
  }

  // Soft limit of 1GB = 1073741824 bytes
  if (totalSize > 1073741824) {
    throw new BadRequestError(
      'Limite de armazenamento (1GB) atingido. Entre em contato com o suporte.',
    )
  }

  e.next()
}, 'negotiations')
