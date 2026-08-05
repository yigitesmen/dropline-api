import 'dotenv/config';

import { createApp } from './app';

const REQUIRED_ENV_VARS = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_EXPIRES_IN',
] as const;

for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) {
        console.error(`Missing required environment variable: ${key}`);
        process.exit(1);
    }
}

const PORT = process.env.PORT ?? 3000;

const app = createApp();

app.listen(PORT, () => {
    console.log(`dropline-api listening on port ${PORT}`);
});
