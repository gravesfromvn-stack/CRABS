import { sqliteTable, text, integer, primaryKey, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const contacts = sqliteTable('contacts', {
 owner:text('owner').notNull(),id:text('id').notNull(),name:text('name').notNull(),
 segment:text('segment').notNull(),source:text('source').notNull(),status:text('status').notNull(),
 assignee:text('assignee').notNull(),due:text('due').notNull(),serviceDate:text('service_date').notNull(),
 adults:integer('adults').notNull(),children:text('children').notNull(),budget:integer('budget').notNull(),
 interest:text('interest').notNull(),note:text('note').notNull(),stay:text('stay').notNull(),
 reception:text('reception').notNull().default('{}'),
 version:integer('version').notNull().default(1),updated:text('updated').notNull(),
},t=>[primaryKey({columns:[t.owner,t.id]}),index('contacts_owner_updated').on(t.owner,t.updated)]);
export const messages=sqliteTable('messages',{
 owner:text('owner').notNull(),id:text('id').notNull(),contactId:text('contact_id').notNull(),
 direction:text('direction').notNull(),body:text('body').notNull(),created:text('created').notNull(),
},t=>[primaryKey({columns:[t.owner,t.id]}),index('messages_contact').on(t.owner,t.contactId,t.created)]);
export const activity=sqliteTable('activity',{
 owner:text('owner').notNull(),id:text('id').notNull(),contactId:text('contact_id').notNull(),
 detail:text('detail').notNull(),created:text('created').notNull(),
},t=>[primaryKey({columns:[t.owner,t.id]})]);
export const settings=sqliteTable('settings',{
 owner:text('owner').primaryKey(),seedVersion:integer('seed_version').notNull(),
});
export const replyDrafts=sqliteTable('reply_drafts',{
 owner:text('owner').notNull(),contactId:text('contact_id').notNull(),revision:integer('revision').notNull(),
 operationId:text('operation_id').notNull(),body:text('body').notNull(),status:text('status').notNull(),
 contextKey:text('context_key').notNull(),sourceIds:text('source_ids').notNull(),created:text('created').notNull(),approvedAt:text('approved_at'),
},t=>[primaryKey({columns:[t.owner,t.contactId,t.revision]})]);
export const quotes=sqliteTable('quotes',{
 owner:text('owner').notNull(),id:text('id').notNull(),contactId:text('contact_id').notNull(),
 currentRevision:integer('current_revision').notNull(),operationId:text('operation_id').notNull(),
},t=>[primaryKey({columns:[t.owner,t.id]})]);
export const quoteVersions=sqliteTable('quote_versions',{
 owner:text('owner').notNull(),quoteId:text('quote_id').notNull(),revision:integer('revision').notNull(),
 payload:text('payload').notNull(),status:text('status').notNull(),created:text('created').notNull(),
 approvedAt:text('approved_at'),approvalOperation:text('approval_operation'),
},t=>[primaryKey({columns:[t.owner,t.quoteId,t.revision]})]);
export const otaMailbox=sqliteTable('ota_mailbox',{
 mailbox:text('mailbox').primaryKey(),owner:text('owner').notNull(),created:text('created').notNull(),lastReceived:text('last_received').notNull().default(''),
});
export const otaEvents=sqliteTable('ota_events',{
 owner:text('owner').notNull(),id:text('id').notNull(),mailbox:text('mailbox').notNull(),gmailThread:text('gmail_thread').notNull(),internetId:text('internet_id').notNull(),
 subject:text('subject').notNull(),sender:text('sender').notNull(),received:text('received').notNull(),imported:text('imported').notNull(),fullText:text('full_text').notNull(),guestText:text('guest_text').notNull(),
 channel:text('channel').notNull(),bookingId:text('booking_id').notNull(),propertyId:text('property_id').notNull(),propertyLabel:text('property_label').notNull(),guestName:text('guest_name').notNull(),
 kind:text('kind').notNull(),reason:text('reason').notNull(),authenticated:integer('authenticated').notNull(),status:text('status').notNull(),threadId:text('thread_id').notNull(),resolvedBy:text('resolved_by').notNull().default(''),
},t=>[primaryKey({columns:[t.owner,t.id]}),index('ota_events_thread').on(t.owner,t.threadId,t.received),index('ota_events_status').on(t.owner,t.status,t.received)]);
export const otaThreads=sqliteTable('ota_threads',{
 owner:text('owner').notNull(),id:text('id').notNull(),propertyId:text('property_id').notNull(),channel:text('channel').notNull(),bookingId:text('booking_id').notNull(),created:text('created').notNull(),
},t=>[primaryKey({columns:[t.owner,t.id]}),uniqueIndex('ota_thread_identity').on(t.owner,t.propertyId,t.channel,t.bookingId)]);
export const otaDrafts=sqliteTable('ota_drafts',{
 owner:text('owner').notNull(),threadId:text('thread_id').notNull(),revision:integer('revision').notNull(),operationId:text('operation_id').notNull(),contextKey:text('context_key').notNull(),body:text('body').notNull(),notes:text('notes').notNull(),status:text('status').notNull(),created:text('created').notNull(),approvedAt:text('approved_at'),sentAt:text('sent_at'),
},t=>[primaryKey({columns:[t.owner,t.threadId,t.revision]}),uniqueIndex('ota_draft_operation').on(t.owner,t.operationId)]);
export const otaSent=sqliteTable('ota_sent',{
 owner:text('owner').notNull(),id:text('id').notNull(),threadId:text('thread_id').notNull(),revision:integer('revision').notNull(),body:text('body').notNull(),created:text('created').notNull(),
},t=>[primaryKey({columns:[t.owner,t.id]})]);
export const otaReviews=sqliteTable('ota_reviews',{
 owner:text('owner').notNull(),operationId:text('operation_id').notNull(),eventId:text('event_id').notNull(),payloadHash:text('payload_hash').notNull(),threadId:text('thread_id').notNull(),decision:text('decision').notNull(),note:text('note').notNull(),evidence:text('evidence').notNull(),candidateDraft:text('candidate_draft').notNull(),previousState:text('previous_state').notNull(),created:text('created').notNull(),
},t=>[primaryKey({columns:[t.owner,t.operationId]}),index('ota_reviews_event').on(t.owner,t.eventId,t.created)]);
export const otaGuestProfiles=sqliteTable('ota_guest_profiles',{
 owner:text('owner').notNull(),threadId:text('thread_id').notNull(),sourceKey:text('source_key').notNull(),payload:text('payload').notNull(),attempted:text('attempted').notNull().default(''),updated:text('updated').notNull(),
},t=>[primaryKey({columns:[t.owner,t.threadId,t.sourceKey]})]);
