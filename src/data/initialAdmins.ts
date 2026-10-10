import { AdminAccount } from '../types';

export const INITIAL_ADMIN_ACCOUNTS: AdminAccount[] = [
  {
    id: 'admin-komando',
    username: 'komando',
    name: 'Admin Komando Pusat (Kasatpol PP / Provost)',
    role: 'komando_pusat',
    reguScope: 'all',
    pin: '123456',
    phone: '0812-7000-0001'
  },
  {
    id: 'admin-danru-1',
    username: 'danru1',
    name: 'Admin Danru Regu 1 (Operasional)',
    role: 'danru_1',
    reguScope: 'Regu 1',
    pin: '111111',
    phone: '0812-7000-0002'
  },
  {
    id: 'admin-danru-2',
    username: 'danru2',
    name: 'Admin Danru Regu 2 (Dalmas / PAM)',
    role: 'danru_2',
    reguScope: 'Regu 2',
    pin: '222222',
    phone: '0812-7000-0003'
  },
  {
    id: 'admin-danru-3',
    username: 'danru3',
    name: 'Admin Danru Regu 3 (Penegakan Perda)',
    role: 'danru_3',
    reguScope: 'Regu 3',
    pin: '333333',
    phone: '0812-7000-0004'
  },
  {
    id: 'admin-danru-4',
    username: 'danru4',
    name: 'Admin Danru Regu 4 (Patroli Wilayah & URC)',
    role: 'danru_4',
    reguScope: 'Regu 4',
    pin: '444444',
    phone: '0812-7000-0005'
  }
];
