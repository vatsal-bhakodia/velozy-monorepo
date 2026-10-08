# Platform billing setup

Platform billing uses Velozy's Dodo account. It is separate from each site's merchant payment connection and webhook.

## Dodo products and environment

Configure these API environment variables:

- `DODO_PLATFORM_API_KEY`
- `DODO_PLATFORM_WEBHOOK_SECRET`
- `DODO_PLATFORM_MODE=test` for staging; set `live` only after end-to-end staging verification.
- `DODO_PLATFORM_LIVE_ENABLED=false` until staging verification is complete.
- `DODO_PLATFORM_PRODUCTS_JSON` with IDs for recurring monthly and annual Launch/Scale products in INR and USD, plus each one-time AI top-up in INR and USD.

Example shape (replace every value with a Dodo catalog product ID):

```json
{
  "foundation": {
    "launch": {
      "INR": { "month": "prod_launch_inr_month", "year": "prod_launch_inr_year" },
      "USD": { "month": "prod_launch_usd_month", "year": "prod_launch_usd_year" }
    },
    "scale": {
      "INR": { "month": "prod_scale_inr_month", "year": "prod_scale_inr_year" },
      "USD": { "month": "prod_scale_usd_month", "year": "prod_scale_usd_year" }
    }
  },
  "credits": {
    "ai_100": { "INR": "prod_ai_100_inr", "USD": "prod_ai_100_usd" },
    "ai_500": { "INR": "prod_ai_500_inr", "USD": "prod_ai_500_usd" },
    "ai_1500": { "INR": "prod_ai_1500_inr", "USD": "prod_ai_1500_usd" },
    "ai_5000": { "INR": "prod_ai_5000_inr", "USD": "prod_ai_5000_usd" }
  }
}
```

The product catalog prices and billing intervals must match `docs/pricing_config.json`. Configure the platform webhook URL as `/api/webhooks/platform/dodo`. Existing merchant hooks remain at `/api/webhooks/dodo`.

Subscription webhooks use Dodo's event timestamp to ignore older deliveries, and `previous_billing_date` as the current period start when supplied. Scheduled product changes are synced from `scheduled_change.product_id`.

`refund.succeeded` events are acknowledged and recorded, but do not automatically remove AI credits. Purchased credits are held in a pooled project balance, so a refund cannot safely identify how many credits from that particular purchase remain unused. Reconcile refunds against the remaining balance manually; do not assume that a Dodo refund also revokes AI credits.

## Migration and activation

Apply the additive database migration `packages/db/drizzle/0004_platform_billing.sql` before starting the API. Complete test-mode subscription checkout, renewal/change-plan, AI top-up, signature rejection, and webhook retry checks. Only then set live mode and explicitly enable live billing.
