export const subscriptions = [
  { id: 'sub_1', status: 'active', companyId: 'comp_1' },
  { id: 'sub_2', status: 'expired', companyId: 'comp_2' },
]

export const users = [
  {
    id: '1',
    email: 'elektraengenhariasolucoes',
    password: '1234',
    role: 'admin_elektra',
    status: 'active',
    companyId: 'comp_1',
    name: 'Admin Elektra',
  },
  {
    id: '2',
    email: 'empresa@teste.com.br',
    password: '1234',
    role: 'admin_company',
    status: 'active',
    companyId: 'comp_1',
    name: 'Empresa Teste',
  },
  {
    id: '3',
    email: 'bloqueado@teste.com',
    password: '1234',
    role: 'user',
    status: 'blocked',
    companyId: 'comp_1',
    name: 'User Blocked',
  },
  {
    id: '4',
    email: 'expirado@teste.com',
    password: '1234',
    role: 'user',
    status: 'active',
    companyId: 'comp_2',
    name: 'User Expired',
  },
]
