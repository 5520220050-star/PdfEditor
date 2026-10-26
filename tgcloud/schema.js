import { table, integer, text, blob, index, sql } from 'sdk/db';

// Temporary storage for file pieces while the mini app uploads a result.
// Rows are deleted as soon as the file is sent (and after 1 hour at most).
export const uploads = table('uploads', {
  id:       integer('id').primaryKey({ autoIncrement: true }),
  uploadId: text('upload_id').notNull(),
  userId:   integer('user_id').notNull(),
  idx:      integer('idx').notNull(),
  data:     blob('data'),
  created:  integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
}, (t) => ({
  uploadIdx: index('idx_uploads_upload').on(t.uploadId),
}));
