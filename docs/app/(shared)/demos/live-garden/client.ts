'use client';

import { createDemoClient } from '@/functions/createDemoClient';

const ClientProvider = createDemoClient(import.meta.url);

export default ClientProvider;
