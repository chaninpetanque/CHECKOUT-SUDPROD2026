import { defineConfig } from '@playwright/test';
import process from 'node:process';

const baseURL = process.env.BASE_URL || 'http://localhost:5173';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'on-first-retry'
  }
});
