import { createLiveDemo } from '@/functions/createLiveDemo';
import ClientProvider from './client';
import Garden from './Garden';

export const DemoLiveGarden = createLiveDemo(import.meta.url, Garden, { ClientProvider });
