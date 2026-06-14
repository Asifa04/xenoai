import { pool } from './index';

export async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
     DO $$ BEGIN
     CREATE TYPE campaign_status AS ENUM ('DRAFT', 'RUNNING', 'COMPLETED', 'FAILED');
     EXCEPTION
     WHEN duplicate_object THEN NULL;
     END $$;

     DO $$ BEGIN
     CREATE TYPE communication_status AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'OPENED', 'READ', 'CLICKED', 'FAILED');
     EXCEPTION
     WHEN duplicate_object THEN NULL;
     END $$;

      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        city TEXT,
        gender TEXT,
        signup_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL REFERENCES customers(id),
        order_amount DOUBLE PRECISION NOT NULL,
        order_date TIMESTAMPTZ NOT NULL,
        products JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS segments (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        rules JSONB NOT NULL,
        ai_prompt TEXT,
        size INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS campaigns (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        segment_id TEXT NOT NULL REFERENCES segments(id),
        channel TEXT NOT NULL,
        message TEXT NOT NULL,
        status campaign_status NOT NULL DEFAULT 'DRAFT',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        sent_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS communications (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL REFERENCES campaigns(id),
        customer_id TEXT NOT NULL REFERENCES customers(id),
        channel TEXT NOT NULL,
        message TEXT NOT NULL,
        status communication_status NOT NULL DEFAULT 'QUEUED',
        sent_at TIMESTAMPTZ,
        delivered_at TIMESTAMPTZ,
        opened_at TIMESTAMPTZ,
        read_at TIMESTAMPTZ,
        clicked_at TIMESTAMPTZ,
        failed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS communication_events (
        id TEXT PRIMARY KEY,
        communication_id TEXT NOT NULL REFERENCES communications(id),
        event TEXT NOT NULL,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS campaign_analytics (
        id TEXT PRIMARY KEY,
        campaign_id TEXT UNIQUE NOT NULL REFERENCES campaigns(id),
        total_sent INTEGER NOT NULL DEFAULT 0,
        delivered INTEGER NOT NULL DEFAULT 0,
        failed INTEGER NOT NULL DEFAULT 0,
        opened INTEGER NOT NULL DEFAULT 0,
        read INTEGER NOT NULL DEFAULT 0,
        clicked INTEGER NOT NULL DEFAULT 0,
        conversions INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
      CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);
      CREATE INDEX IF NOT EXISTS idx_communications_campaign_id ON communications(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_communications_customer_id ON communications(customer_id);
      CREATE INDEX IF NOT EXISTS idx_communication_events_comm_id ON communication_events(communication_id);
    `);
    console.log('✅ Database tables created/verified');
  } catch (err) {
    console.error('Migration error:', err);
    throw err;
  } finally {
    client.release();
  }
}
