import { sql as initial } from './001-initial';

export interface Migration {
  /** Sortable and unique: `001-initial`. */
  id: string;
  sql: string;
}

/** Every migration, oldest first. Append only. */
export const migrations: Migration[] = [{ id: '001-initial', sql: initial }];
