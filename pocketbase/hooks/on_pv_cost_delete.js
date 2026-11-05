onRecordDeleteRequest((e) => {
  if (e.record.getBool('is_structural')) {
    throw new BadRequestError(
      'Este grupo de custos é estrutural da empresa (Imposto, Comissão ou Margem) e não pode ser excluído.',
    )
  }
  return e.next()
}, 'pv_costs')
