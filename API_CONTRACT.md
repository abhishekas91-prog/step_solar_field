# API Contract — StepSolar Field ↔ StepSolar-CRM

> This same file lives in the separate `StepSolar-CRM` repo. If you change any
> endpoint shape listed below in `server.py`, update it in both places and check
> whether the app needs a matching change before shipping.

This app is a **separate repo** from `StepSolar-CRM` but talks to the same
backend (`stepsolar-backend.onrender.com`). Since there's no shared code
between the two repos, this file is the connection between them — it's
the exact set of endpoints/shapes this app depends on.

**Rule:** if you change any of the request/response shapes below in
`server.py`, update this file in *both* repos in the same sitting, and
check whether the app needs a matching change before you ship the
backend change. If you only add new optional fields, the app keeps
working untouched — just add a line here for the record.

Base URL: `https://stepsolar-backend.onrender.com/api`

| Endpoint | Used for | Notes |
|---|---|---|
| `POST /auth/login` | Login | body `{email, password}` → `{access_token, id, email, full_name, role, must_change_password}` |
| `GET /auth/me` | Session validation on app reopen | Bearer token → `{id, email, full_name, role}` |
| `GET /crm/leads` | Projects list | App filters on-device by current stage / search / today. `GET /crm/leads/mine` is not required. |
| `GET /crm/leads/{id}` | Project detail | Full lead doc incl. `stages[]`. If 404, app falls back to the list payload. |
| `POST /crm/leads` | New field lead | body CRM lead intake (`full_name`, `phone`, `email`, optional city/state/…) `source` defaults to `Field Agent` |
| `PATCH /crm/leads/{id}` | Stage status/notes/location update | body `{stages: [...]}` — **must send the full stages array**, only the target stage's fields changed, same order/keys as received. Role-based: non-Admin can only change stages where `stage.owner === my role`. |
| `POST /crm/leads/{id}/comments` | Field comment | body `{text}` |
| `POST /crm/leads/{id}/stages/{stage_key}/documents` | Proof photo upload | multipart `file` field. |
| `POST /crm/leads/{id}/whatsapp/document` | Send quotation/invoice/receipt via WaCRM | body `{document_type, document_no?, message?}`. Returns `{ok, status, log_id, error}`. `error=whatsapp_disabled` until Admin pastes a `wacrm_live_` key. |
| `GET /crm/whatsapp/chat?phone=` | Live WaCRM inbox for field chat overlay | Bearer JWT. Query `phone` (8–20 chars). Returns `{ok, enabled, phone, conversation_id, contact_id, messages[], error}`. |
| `POST /crm/whatsapp/chat` | Send free-form WhatsApp text via WaCRM | body `{phone, text}`. Returns `{ok, conversation_id, message_id, error}`. Same thread as the CRM popup. |

## Fields this app adds to the stage object

The backend stores each stage as a free-form dict (only `key` and
`status` are validated), so this app rides an extra field on top without
any backend schema change:

```json
{
  "location": { "lat": 0.0, "lng": 0.0, "accuracy": 0.0, "capturedAt": "iso8601" }
}
```

The CRM web frontend can read this same field to show GPS + notes + photo count per stage.

## Remote PV design (additive — field + CRM)

New endpoints. Existing `/crm/leads*` shapes are unchanged.

| Endpoint | Used for | Notes |
|---|---|---|
| `GET /crm/designs?lead_id=` | Load design for a site | Newest first |
| `POST /crm/designs` | Create if missing | body `{lead_id, name, address, annual_bill_kwh, location}` |
| `PUT /crm/designs/{id}` | Save GPS + roof rectangle | |
| `POST /crm/designs/{id}/simulate` | Field layout + kWh / payback | Returns `{design, result}` |
| `POST /crm/designs/{id}/generate` | CRM annual generation | CRM-only. Returns `{design, generation}`. Alias `POST /api/design/designs/{id}/generate`. |
| `POST /crm/designs/{id}/irradiance` | CRM solar-access heatmap | CRM-only. Google Solar + 14-day cache; shadow fallback 0.7–1.0. |

Field app sends a single roof from length × width around the GPS pin. Desktop CRM studio can replace that with traced satellite polygons.

CRM-only (field app does not call these): `/crm/solar-projects*` tariff, consumption, nested `designs`, `defaults-profiles`, `/crm/designs/{id}/generate`, `/crm/designs/{id}/irradiance`, `/crm/designs/{id}/proposal*`, `/crm/subsidy-settings`, `/crm/pricing-templates`. Public (no auth): `GET /api/public/proposal/{token}`. Existing `/crm/designs` + `/crm/leads*` shapes above are unchanged.

## Versioning

No formal API version header yet (single backend, single app). If that
ever becomes a problem, add an `X-App-Version` header from the app and
log it server-side before making a breaking change.
