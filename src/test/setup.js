import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// `globals: true` is intentionally disabled in vitest.config.js, so
// @testing-library/react's auto-cleanup hook never registers. Register
// it here once so every test using render() gets per-test DOM cleanup.
afterEach(() => cleanup());
