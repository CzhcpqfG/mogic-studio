export const POSTGRESQL_COMMERCIAL_FEATURES_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS promotion_campaigns (
    id text PRIMARY KEY,
    name text NOT NULL,
    label text NOT NULL DEFAULT '',
    enabled boolean NOT NULL DEFAULT true,
    starts_at timestamptz NOT NULL,
    ends_at timestamptz NOT NULL,
    created_by_user_id text REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT promotion_campaigns_time CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS promotion_campaigns_active_idx ON promotion_campaigns (enabled, starts_at, ends_at);

CREATE TABLE IF NOT EXISTS promotion_products (
    campaign_id text NOT NULL REFERENCES promotion_campaigns(id) ON DELETE CASCADE,
    product_id text NOT NULL REFERENCES billing_products(id),
    promotional_amount_cents bigint NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (campaign_id, product_id),
    CONSTRAINT promotion_products_amount CHECK (promotional_amount_cents >= 1)
);

CREATE INDEX IF NOT EXISTS promotion_products_product_idx ON promotion_products (product_id, campaign_id);

CREATE TABLE IF NOT EXISTS coupon_templates (
    id text PRIMARY KEY,
    code text NOT NULL,
    name text NOT NULL,
    description text NOT NULL DEFAULT '',
    discount_type text NOT NULL,
    discount_value bigint NOT NULL,
    minimum_amount_cents bigint NOT NULL DEFAULT 0,
    maximum_discount_cents bigint NOT NULL DEFAULT 0,
    stack_with_promotion boolean NOT NULL DEFAULT false,
    claimable boolean NOT NULL DEFAULT true,
    enabled boolean NOT NULL DEFAULT true,
    starts_at timestamptz NOT NULL,
    ends_at timestamptz NOT NULL,
    total_limit integer NOT NULL DEFAULT 0,
    per_user_limit integer NOT NULL DEFAULT 1,
    issued_count integer NOT NULL DEFAULT 0,
    redeemed_count integer NOT NULL DEFAULT 0,
    created_by_user_id text REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT coupon_templates_type CHECK (discount_type IN ('fixed', 'percentage')),
    CONSTRAINT coupon_templates_value CHECK (discount_value > 0 AND (discount_type <> 'percentage' OR discount_value <= 10000)),
    CONSTRAINT coupon_templates_amounts CHECK (minimum_amount_cents >= 0 AND maximum_discount_cents >= 0),
    CONSTRAINT coupon_templates_time CHECK (ends_at > starts_at),
    CONSTRAINT coupon_templates_limits CHECK (total_limit >= 0 AND per_user_limit >= 1 AND issued_count >= 0 AND redeemed_count >= 0 AND redeemed_count <= issued_count)
);

CREATE UNIQUE INDEX IF NOT EXISTS coupon_templates_code_idx ON coupon_templates (upper(code));
CREATE INDEX IF NOT EXISTS coupon_templates_active_idx ON coupon_templates (enabled, claimable, starts_at, ends_at);

CREATE TABLE IF NOT EXISTS coupon_template_products (
    template_id text NOT NULL REFERENCES coupon_templates(id) ON DELETE CASCADE,
    product_id text NOT NULL REFERENCES billing_products(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (template_id, product_id)
);

CREATE INDEX IF NOT EXISTS coupon_template_products_product_idx ON coupon_template_products (product_id, template_id);

CREATE TABLE IF NOT EXISTS billing_orders (
    id text PRIMARY KEY,
    order_no text NOT NULL UNIQUE,
    product_id text REFERENCES billing_products(id),
    user_id text REFERENCES users(id) ON DELETE SET NULL,
    product_kind text NOT NULL DEFAULT 'plan',
    plan_id text REFERENCES entitlement_plans(id),
    status text NOT NULL DEFAULT 'pending',
    subject text NOT NULL,
    amount_cents bigint NOT NULL DEFAULT 0,
    currency text NOT NULL DEFAULT 'CNY',
    points_amount numeric(18, 2) NOT NULL DEFAULT 0,
    daily_points numeric(18, 2) NOT NULL DEFAULT 0,
    period_days integer NOT NULL DEFAULT 0,
    quantity integer NOT NULL DEFAULT 1,
    provider text NOT NULL DEFAULT '',
    provider_order_id text,
    provider_payment_id text,
    expires_at timestamptz,
    paid_at timestamptz,
    closed_at timestamptz,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT billing_orders_status CHECK (status IN ('pending', 'paid', 'closed', 'canceled', 'refunding', 'refunded')),
    CONSTRAINT billing_orders_amount CHECK (amount_cents >= 0),
    CONSTRAINT billing_orders_daily_points CHECK (daily_points >= 0),
    CONSTRAINT billing_orders_kind CHECK (product_kind IN ('plan', 'points')),
    CONSTRAINT billing_orders_period_days CHECK (period_days >= 0),
    CONSTRAINT billing_orders_quantity CHECK (quantity >= 1)
);

CREATE INDEX IF NOT EXISTS billing_orders_user_created_idx ON billing_orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS billing_orders_status_created_idx ON billing_orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS billing_orders_created_idx ON billing_orders (created_at DESC);
CREATE INDEX IF NOT EXISTS billing_orders_pending_expires_idx ON billing_orders (expires_at, id) WHERE status = 'pending' AND expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS billing_orders_provider_idx ON billing_orders (provider, provider_order_id);
CREATE INDEX IF NOT EXISTS billing_orders_provider_payment_idx ON billing_orders (provider, provider_payment_id);

ALTER TABLE billing_orders ADD COLUMN IF NOT EXISTS product_id text REFERENCES billing_products(id);
ALTER TABLE billing_orders ADD COLUMN IF NOT EXISTS product_kind text NOT NULL DEFAULT 'plan';
ALTER TABLE billing_orders ADD COLUMN IF NOT EXISTS daily_points numeric(18, 2) NOT NULL DEFAULT 0;
ALTER TABLE billing_orders ALTER COLUMN plan_id DROP NOT NULL;
ALTER TABLE billing_orders DROP CONSTRAINT IF EXISTS billing_orders_status;
ALTER TABLE billing_orders ADD CONSTRAINT billing_orders_status CHECK (status IN ('pending', 'paid', 'closed', 'canceled', 'refunding', 'refunded'));
ALTER TABLE billing_orders DROP CONSTRAINT IF EXISTS billing_orders_kind;
ALTER TABLE billing_orders ADD CONSTRAINT billing_orders_kind CHECK (product_kind IN ('plan', 'points'));
ALTER TABLE billing_orders DROP CONSTRAINT IF EXISTS billing_orders_daily_points;
ALTER TABLE billing_orders ADD CONSTRAINT billing_orders_daily_points CHECK (daily_points >= 0);
CREATE INDEX IF NOT EXISTS billing_orders_product_idx ON billing_orders (product_id, created_at DESC);

CREATE TABLE IF NOT EXISTS user_coupons (
    id text PRIMARY KEY,
    template_id text NOT NULL REFERENCES coupon_templates(id),
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'available',
    grant_source text NOT NULL DEFAULT 'claim',
    claimed_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    locked_order_id text REFERENCES billing_orders(id),
    locked_at timestamptz,
    redeemed_order_id text REFERENCES billing_orders(id),
    redeemed_at timestamptz,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT user_coupons_status CHECK (status IN ('available', 'locked', 'redeemed', 'expired', 'revoked')),
    CONSTRAINT user_coupons_lock_state CHECK (status <> 'locked' OR locked_order_id IS NOT NULL),
    CONSTRAINT user_coupons_redeem_state CHECK (status <> 'redeemed' OR redeemed_order_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS user_coupons_user_status_idx ON user_coupons (user_id, status, expires_at, created_at DESC);
CREATE INDEX IF NOT EXISTS user_coupons_template_user_idx ON user_coupons (template_id, user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_coupons_locked_order_idx ON user_coupons (locked_order_id) WHERE locked_order_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS coupon_redemptions (
    id text PRIMARY KEY,
    user_coupon_id text NOT NULL REFERENCES user_coupons(id),
    order_id text NOT NULL REFERENCES billing_orders(id),
    user_id text NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    template_id text NOT NULL REFERENCES coupon_templates(id),
    status text NOT NULL DEFAULT 'redeemed',
    discount_cents bigint NOT NULL,
    rule_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
    redeemed_at timestamptz NOT NULL,
    refunded_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT coupon_redemptions_status CHECK (status IN ('redeemed', 'refunded')),
    CONSTRAINT coupon_redemptions_discount CHECK (discount_cents >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS coupon_redemptions_order_idx ON coupon_redemptions (order_id);
CREATE UNIQUE INDEX IF NOT EXISTS coupon_redemptions_coupon_idx ON coupon_redemptions (user_coupon_id);

ALTER TABLE billing_orders ADD COLUMN IF NOT EXISTS list_amount_cents bigint NOT NULL DEFAULT 0;
ALTER TABLE billing_orders ADD COLUMN IF NOT EXISTS promotion_discount_cents bigint NOT NULL DEFAULT 0;
ALTER TABLE billing_orders ADD COLUMN IF NOT EXISTS coupon_discount_cents bigint NOT NULL DEFAULT 0;
ALTER TABLE billing_orders ADD COLUMN IF NOT EXISTS promotion_campaign_id text REFERENCES promotion_campaigns(id);
ALTER TABLE billing_orders ADD COLUMN IF NOT EXISTS user_coupon_id text REFERENCES user_coupons(id);
ALTER TABLE billing_orders ADD COLUMN IF NOT EXISTS pricing_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;
UPDATE billing_orders SET list_amount_cents = amount_cents WHERE list_amount_cents = 0 AND amount_cents > 0;
ALTER TABLE billing_orders DROP CONSTRAINT IF EXISTS billing_orders_pricing_amounts;
ALTER TABLE billing_orders ADD CONSTRAINT billing_orders_pricing_amounts CHECK (list_amount_cents >= 0 AND promotion_discount_cents >= 0 AND coupon_discount_cents >= 0);
ALTER TABLE billing_orders DROP CONSTRAINT IF EXISTS billing_orders_pricing_balance;
ALTER TABLE billing_orders ADD CONSTRAINT billing_orders_pricing_balance CHECK (amount_cents = list_amount_cents - promotion_discount_cents - coupon_discount_cents);

CREATE TABLE IF NOT EXISTS payment_transactions (
    id text PRIMARY KEY,
    order_id text NOT NULL REFERENCES billing_orders(id),
    user_id text REFERENCES users(id) ON DELETE SET NULL,
    provider text NOT NULL,
    channel text NOT NULL DEFAULT '',
    status text NOT NULL DEFAULT 'pending',
    amount_cents bigint NOT NULL DEFAULT 0,
    currency text NOT NULL DEFAULT 'CNY',
    provider_trade_id text,
    provider_payment_id text,
    raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    paid_at timestamptz,
    refunded_at timestamptz,
    failed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT payment_transactions_status CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
    CONSTRAINT payment_transactions_amount CHECK (amount_cents >= 0)
);

CREATE INDEX IF NOT EXISTS payment_transactions_order_idx ON payment_transactions (order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_transactions_user_idx ON payment_transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_transactions_created_idx ON payment_transactions (created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS payment_transactions_provider_trade_idx ON payment_transactions (provider, provider_trade_id) WHERE provider_trade_id IS NOT NULL AND provider_trade_id <> '';
CREATE UNIQUE INDEX IF NOT EXISTS payment_transactions_provider_payment_idx ON payment_transactions (provider, provider_payment_id) WHERE provider_payment_id IS NOT NULL AND provider_payment_id <> '';

CREATE TABLE IF NOT EXISTS billing_refund_jobs (
    id text PRIMARY KEY,
    order_id text NOT NULL UNIQUE REFERENCES billing_orders(id) ON DELETE CASCADE,
    payment_id text REFERENCES payment_transactions(id) ON DELETE SET NULL,
    provider text NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    provider_refund_id text,
    attempts integer NOT NULL DEFAULT 0,
    next_attempt_at timestamptz,
    last_error text,
    raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    worker_id text,
    lease_until timestamptz,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT billing_refund_jobs_status CHECK (status IN ('pending', 'processing', 'compensating', 'completed', 'manual', 'failed')),
    CONSTRAINT billing_refund_jobs_attempts CHECK (attempts >= 0)
);

CREATE INDEX IF NOT EXISTS billing_refund_jobs_due_idx ON billing_refund_jobs (next_attempt_at, lease_until, id) WHERE status IN ('pending', 'processing', 'compensating');
CREATE UNIQUE INDEX IF NOT EXISTS billing_refund_jobs_provider_refund_idx ON billing_refund_jobs (provider, provider_refund_id) WHERE provider_refund_id IS NOT NULL AND provider_refund_id <> '';

CREATE TABLE IF NOT EXISTS referral_programs (
    id text PRIMARY KEY DEFAULT 'default',
    enabled boolean NOT NULL DEFAULT false,
    inviter_points numeric(18, 2) NOT NULL DEFAULT 0,
    invitee_reward_type text NOT NULL DEFAULT 'points',
    invitee_points numeric(18, 2) NOT NULL DEFAULT 0,
    invitee_coupon_template_id text REFERENCES coupon_templates(id) ON DELETE SET NULL,
    minimum_paid_cents bigint NOT NULL DEFAULT 0,
    cooling_off_days integer NOT NULL DEFAULT 7,
    inviter_monthly_limit integer NOT NULL DEFAULT 0,
    campaign_total_limit integer NOT NULL DEFAULT 0,
    auto_freeze_risk boolean NOT NULL DEFAULT true,
    created_by_user_id text REFERENCES users(id) ON DELETE SET NULL,
    updated_by_user_id text REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT referral_programs_singleton CHECK (id = 'default'),
    CONSTRAINT referral_programs_reward_type CHECK (invitee_reward_type IN ('points', 'coupon')),
    CONSTRAINT referral_programs_values CHECK (inviter_points >= 0 AND invitee_points >= 0 AND minimum_paid_cents >= 0 AND cooling_off_days >= 0 AND inviter_monthly_limit >= 0 AND campaign_total_limit >= 0),
    CONSTRAINT referral_programs_coupon CHECK (invitee_reward_type <> 'coupon' OR invitee_coupon_template_id IS NOT NULL)
);

INSERT INTO referral_programs (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS referral_codes (
    id text PRIMARY KEY,
    user_id text NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    code text NOT NULL,
    enabled boolean NOT NULL DEFAULT true,
    click_count bigint NOT NULL DEFAULT 0,
    last_clicked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT referral_codes_clicks CHECK (click_count >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS referral_codes_code_idx ON referral_codes (upper(code));

CREATE TABLE IF NOT EXISTS referral_relationships (
    id text PRIMARY KEY,
    inviter_user_id text NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    invitee_user_id text NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    referral_code_id text NOT NULL REFERENCES referral_codes(id) ON DELETE RESTRICT,
    attribution_source text NOT NULL DEFAULT 'registration-form',
    attribution_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    registration_ip_hash text,
    payment_identity_hash text,
    risk_status text NOT NULL DEFAULT 'clear',
    risk_signals jsonb NOT NULL DEFAULT '{}'::jsonb,
    registered_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT referral_relationships_users CHECK (inviter_user_id <> invitee_user_id),
    CONSTRAINT referral_relationships_risk CHECK (risk_status IN ('clear', 'review', 'frozen', 'rejected'))
);

CREATE INDEX IF NOT EXISTS referral_relationships_inviter_idx ON referral_relationships (inviter_user_id, registered_at DESC);
CREATE INDEX IF NOT EXISTS referral_relationships_risk_idx ON referral_relationships (risk_status, registered_at DESC);
CREATE INDEX IF NOT EXISTS referral_relationships_ip_idx ON referral_relationships (inviter_user_id, registration_ip_hash, registered_at DESC) WHERE registration_ip_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS referral_relationships_payment_idx ON referral_relationships (payment_identity_hash) WHERE payment_identity_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS referral_rewards (
    id text PRIMARY KEY,
    relationship_id text NOT NULL REFERENCES referral_relationships(id) ON DELETE RESTRICT,
    beneficiary_user_id text NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    beneficiary_role text NOT NULL,
    reward_type text NOT NULL,
    points_amount numeric(18, 2) NOT NULL DEFAULT 0,
    coupon_template_id text REFERENCES coupon_templates(id) ON DELETE SET NULL,
    trigger_order_id text NOT NULL REFERENCES billing_orders(id) ON DELETE RESTRICT,
    status text NOT NULL DEFAULT 'pending',
    settle_after timestamptz NOT NULL,
    wallet_record_id text REFERENCES point_records(id) ON DELETE SET NULL,
    reversal_wallet_record_id text REFERENCES point_records(id) ON DELETE SET NULL,
    user_coupon_id text REFERENCES user_coupons(id) ON DELETE SET NULL,
    reason text,
    settled_at timestamptz,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT referral_rewards_role CHECK (beneficiary_role IN ('inviter', 'invitee')),
    CONSTRAINT referral_rewards_type CHECK (reward_type IN ('points', 'coupon')),
    CONSTRAINT referral_rewards_status CHECK (status IN ('pending', 'settled', 'revoked', 'rejected', 'reversal_pending')),
    CONSTRAINT referral_rewards_values CHECK (points_amount >= 0 AND (reward_type <> 'coupon' OR coupon_template_id IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS referral_rewards_relationship_role_idx ON referral_rewards (relationship_id, beneficiary_role);
CREATE INDEX IF NOT EXISTS referral_rewards_trigger_order_idx ON referral_rewards (trigger_order_id, beneficiary_role);
CREATE INDEX IF NOT EXISTS referral_rewards_beneficiary_idx ON referral_rewards (beneficiary_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS referral_rewards_due_idx ON referral_rewards (settle_after, id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS referral_rewards_status_idx ON referral_rewards (status, created_at DESC);
`;
