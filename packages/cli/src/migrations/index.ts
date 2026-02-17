/**
 * Registry of all migrations, in ascending version order.
 */

import type { Migration } from './types.js';
import migration001 from './001-add-schema-version.js';

/** All registered migrations. Must be sorted by version ascending. */
export const migrations: Migration[] = [
  migration001,
];
