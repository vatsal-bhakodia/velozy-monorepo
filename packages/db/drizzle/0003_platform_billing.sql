CREATE TABLE "project_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"provider" varchar(30) NOT NULL,
	"provider_subscription_id" varchar(255),
	"provider_customer_id" varchar(255),
	"plan" varchar(80) NOT NULL,
	"interval" varchar(20) NOT NULL,
	"status" varchar(30) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"price_amount" integer DEFAULT 0 NOT NULL,
	"price_version" varchar(40) NOT NULL,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancel_at_period_end" timestamp,
	"scheduled_plan" varchar(80),
	"scheduled_interval" varchar(20),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_subscriptions_price_amount_nonnegative" CHECK ("price_amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "project_credit_wallets" (
	"project_id" uuid PRIMARY KEY NOT NULL,
	"subscription_balance" integer DEFAULT 0 NOT NULL,
	"purchased_balance" integer DEFAULT 0 NOT NULL,
	"reserved_balance" integer DEFAULT 0 NOT NULL,
	"subscription_cycle_start" timestamp,
	"subscription_cycle_end" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_credit_wallets_balances_nonnegative" CHECK ("subscription_balance" >= 0 AND "purchased_balance" >= 0 AND "reserved_balance" >= 0)
);
--> statement-breakpoint
CREATE TABLE "project_credit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"actor_id" uuid,
	"kind" varchar(30) NOT NULL,
	"action" varchar(100) NOT NULL,
	"subscription_delta" integer DEFAULT 0 NOT NULL,
	"purchased_delta" integer DEFAULT 0 NOT NULL,
	"reserved_delta" integer DEFAULT 0 NOT NULL,
	"idempotency_key" varchar(255) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_billing_checkouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"kind" varchar(30) NOT NULL,
	"product_id" varchar(100) NOT NULL,
	"provider_session_id" varchar(255),
	"currency" varchar(3) NOT NULL,
	"amount" integer NOT NULL,
	"credits" integer DEFAULT 0 NOT NULL,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"idempotency_key" varchar(255) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "platform_billing_checkouts_amount_nonnegative" CHECK ("amount" >= 0 AND "credits" >= 0)
);
--> statement-breakpoint
CREATE TABLE "platform_billing_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_event_id" varchar(255) NOT NULL,
	"event_type" varchar(120) NOT NULL,
	"received_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "platform_billing_webhook_events_event_id_unique" UNIQUE("provider_event_id")
);
--> statement-breakpoint
ALTER TABLE "project_subscriptions" ADD CONSTRAINT "project_subscriptions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "project_credit_wallets" ADD CONSTRAINT "project_credit_wallets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "project_credit_events" ADD CONSTRAINT "project_credit_events_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "project_credit_events" ADD CONSTRAINT "project_credit_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "platform_billing_checkouts" ADD CONSTRAINT "platform_billing_checkouts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "platform_billing_checkouts" ADD CONSTRAINT "platform_billing_checkouts_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "project_subscriptions_project_idx" ON "project_subscriptions" USING btree ("project_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "project_subscriptions_provider_identity_idx" ON "project_subscriptions" USING btree ("provider", "provider_subscription_id");
--> statement-breakpoint
CREATE INDEX "project_subscriptions_status_idx" ON "project_subscriptions" USING btree ("status", "current_period_end");
--> statement-breakpoint
CREATE UNIQUE INDEX "project_credit_events_idempotency_idx" ON "project_credit_events" USING btree ("project_id", "idempotency_key");
--> statement-breakpoint
CREATE INDEX "project_credit_events_project_created_idx" ON "project_credit_events" USING btree ("project_id", "created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "platform_billing_checkouts_provider_session_idx" ON "platform_billing_checkouts" USING btree ("provider_session_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "platform_billing_checkouts_idempotency_idx" ON "platform_billing_checkouts" USING btree ("project_id", "idempotency_key");
--> statement-breakpoint
CREATE INDEX "platform_billing_checkouts_project_created_idx" ON "platform_billing_checkouts" USING btree ("project_id", "created_at");
