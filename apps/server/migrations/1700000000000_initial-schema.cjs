// apps/server/migrations/1700000000000_initial-schema.js
// node-pg-migrate uses CommonJS

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {

  // ── Organizations ────────────────────────────────────────────────
  pgm.createTable('organizations', {
    id:         { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name:       { type: 'text', notNull: true },
    slug:       { type: 'text', notNull: true, unique: true },
    plan:       { type: 'text', notNull: true, default: 'free' },
    settings:   { type: 'jsonb', default: '{}' },
    created_at: { type: 'timestamptz', default: pgm.func('NOW()') },
  });

  // ── Users (agents / admins) ──────────────────────────────────────
  pgm.createTable('users', {
    id:            { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    org_id:        { type: 'uuid', notNull: true, references: '"organizations"', onDelete: 'CASCADE' },
    email:         { type: 'text', notNull: true },
    password_hash: { type: 'text', notNull: true },
    name:          { type: 'text', notNull: true },
    role:          { type: 'text', notNull: true, default: 'agent' },
    avatar_url:    { type: 'text' },
    is_active:     { type: 'boolean', notNull: true, default: true },
    last_seen_at:  { type: 'timestamptz' },
    created_at:    { type: 'timestamptz', default: pgm.func('NOW()') },
  });
  pgm.addConstraint('users', 'users_org_email_unique', 'UNIQUE(org_id, email)');

  // ── Customers (people submitting tickets) ────────────────────────
  pgm.createTable('customers', {
    id:         { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    org_id:     { type: 'uuid', notNull: true, references: '"organizations"', onDelete: 'CASCADE' },
    email:      { type: 'text', notNull: true },
    name:       { type: 'text' },
    phone:      { type: 'text' },
    metadata:   { type: 'jsonb', default: '{}' },
    created_at: { type: 'timestamptz', default: pgm.func('NOW()') },
  });
  pgm.addConstraint('customers', 'customers_org_email_unique', 'UNIQUE(org_id, email)');

  // ── Tickets ──────────────────────────────────────────────────────
  pgm.createTable('tickets', {
    id:                    { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    org_id:                { type: 'uuid', notNull: true, references: '"organizations"', onDelete: 'CASCADE' },
    number:                { type: 'serial', notNull: true },
    customer_id:           { type: 'uuid', references: '"customers"' },
    assignee_id:           { type: 'uuid', references: '"users"' },
    status:                { type: 'text', notNull: true, default: 'open' },
    priority:              { type: 'text', notNull: true, default: 'medium' },
    channel:               { type: 'text', notNull: true },
    subject:               { type: 'text', notNull: true },
    tags:                  { type: 'text[]', default: '{}' },
    // AI fields
    ai_category:           { type: 'text' },
    ai_sentiment:          { type: 'text' },
    ai_summary:            { type: 'text' },
    ai_priority:           { type: 'text' },
    // SLA fields
    sla_breached:          { type: 'boolean', default: false },
    first_response_due_at: { type: 'timestamptz' },
    resolution_due_at:     { type: 'timestamptz' },
    first_responded_at:    { type: 'timestamptz' },
    resolved_at:           { type: 'timestamptz' },
    created_at:            { type: 'timestamptz', default: pgm.func('NOW()') },
    updated_at:            { type: 'timestamptz', default: pgm.func('NOW()') },
  });
  pgm.createIndex('tickets', ['org_id', 'status']);
  pgm.createIndex('tickets', ['org_id', 'created_at']);
  pgm.createIndex('tickets', ['assignee_id']);
  pgm.createIndex('tickets', ['customer_id']);

  // ── Messages ─────────────────────────────────────────────────────
  pgm.createTable('messages', {
    id:          { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    ticket_id:   { type: 'uuid', notNull: true, references: '"tickets"', onDelete: 'CASCADE' },
    author_type: { type: 'text', notNull: true },
    author_id:   { type: 'uuid' },
    body:        { type: 'text', notNull: true },
    body_html:   { type: 'text' },
    is_internal: { type: 'boolean', notNull: true, default: false },
    ai_drafted:  { type: 'boolean', notNull: true, default: false },
    attachments: { type: 'jsonb', default: '[]' },
    created_at:  { type: 'timestamptz', default: pgm.func('NOW()') },
  });
  pgm.createIndex('messages', ['ticket_id', 'created_at']);

  // ── AI Suggestions ───────────────────────────────────────────────
  pgm.createTable('ai_suggestions', {
    id:         { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    ticket_id:  { type: 'uuid', notNull: true, references: '"tickets"', onDelete: 'CASCADE' },
    message_id: { type: 'uuid', references: '"messages"' },
    body:       { type: 'text', notNull: true },
    confidence: { type: 'float' },
    used:       { type: 'boolean', default: false },
    edited:     { type: 'boolean', default: false },
    created_at: { type: 'timestamptz', default: pgm.func('NOW()') },
  });

  // ── SLA Policies ─────────────────────────────────────────────────
  pgm.createTable('sla_policies', {
    id:                   { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    org_id:               { type: 'uuid', notNull: true, references: '"organizations"', onDelete: 'CASCADE' },
    name:                 { type: 'text', notNull: true },
    priority:             { type: 'text', notNull: true },
    first_response_hours: { type: 'integer', notNull: true },
    resolution_hours:     { type: 'integer', notNull: true },
    created_at:           { type: 'timestamptz', default: pgm.func('NOW()') },
  });

  // ── Webhook Endpoints ────────────────────────────────────────────
  pgm.createTable('webhook_endpoints', {
    id:         { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    org_id:     { type: 'uuid', notNull: true, references: '"organizations"', onDelete: 'CASCADE' },
    url:        { type: 'text', notNull: true },
    secret:     { type: 'text', notNull: true },
    events:     { type: 'text[]', notNull: true },
    is_active:  { type: 'boolean', default: true },
    created_at: { type: 'timestamptz', default: pgm.func('NOW()') },
  });

  // ── CSAT Ratings ─────────────────────────────────────────────────
  pgm.createTable('csat_ratings', {
    id:          { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    ticket_id:   { type: 'uuid', notNull: true, references: '"tickets"' },
    customer_id: { type: 'uuid', notNull: true, references: '"customers"' },
    score:       { type: 'integer' },
    comment:     { type: 'text' },
    created_at:  { type: 'timestamptz', default: pgm.func('NOW()') },
  });
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('csat_ratings');
  pgm.dropTable('webhook_endpoints');
  pgm.dropTable('sla_policies');
  pgm.dropTable('ai_suggestions');
  pgm.dropTable('messages');
  pgm.dropTable('tickets');
  pgm.dropTable('customers');
  pgm.dropTable('users');
  pgm.dropTable('organizations');
};