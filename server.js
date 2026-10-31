import path from 'node:path';
import { createApp } from './src/app.js';

const port = Number(process.env.PORT) || 3000;
const dataDir = path.resolve(process.env.DATA_DIR || './data');

const app = createApp({ dataDir });
const actual = await app.start(port);
console.log(`Wakeel is running on http://localhost:${actual}  (data: ${dataDir})`);

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, async () => {
    await app.stop();
    process.exit(0);
  });
}
