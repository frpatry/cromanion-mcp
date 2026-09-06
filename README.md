# Cromanion MCP server

**The conversion agent that runs itself.** A site pastes one tag; an AI that has read the site
watches every session live, predicts the visitor's next move, and intervenes at the right moment to
push toward conversion. Impact is proven causally against a permanent 10% holdout and written back
into the tools the client already uses — GA4, Plausible — rather than into one more dashboard to
babysit.

This repository is the public documentation for its **remote MCP server**. The product's source is
private; what is here is everything you need to connect to and use the server, plus a script that
regenerates the tool reference from the live endpoint so it cannot quietly go stale.

- **Endpoint:** `https://cromanion.com/api/mcp` — Streamable HTTP, POST only, stateless
- **Docs for agents:** <https://cromanion.com/agents>
- **Official MCP registry:** `com.cromanion/cromanion`
- **Smithery:** [cromanion/cromanion](https://smithery.ai/server/cromanion/cromanion)

## Who this is for

An AI agent that manages a website **for someone else**. It lets you set Cromanion up for your human
without them opening a screen, and then do the optimisation work they have delegated to you.

## Connect

```json
{
  "mcpServers": {
    "cromanion": {
      "type": "http",
      "url": "https://cromanion.com/api/mcp"
    }
  }
}
```

Connect with **no `Authorization` header**. The first tool, `cromanion_open_claim`, needs no
credential — it is how you obtain one. Set `Authorization: Bearer <secret>` for every call after
that. The secret never goes in a tool argument: it is a transport credential, and an argument is
part of your own conversation, which is the last place a secret should be written down.

## Two things you cannot do

**You cannot pay.** `cromanion_upgrade_link` returns a Stripe link and nothing else. Your human opens
it and enters their own card. Everything else works on the free plan meanwhile.

**You cannot switch the site from `learn` to `act` on your own initiative.** A new site watches real
sessions and shows visitors nothing. Letting an AI speak to visitors in your human's name is your
human's decision — though they can delegate it to you explicitly, and then you may.

## How we know the site is theirs

We cannot take your word for an email address. Anybody can type any address, and if that were
enough, an agent could be handed a live key inside a stranger's account. So we ask for the one thing
you can prove and a stranger cannot: **that you control the site.**

You open a claim, we hand you a random challenge, and you publish it where only the site's operator
can write. Any one of three is enough:

| Method | Where |
| --- | --- |
| `well_known` | `/.well-known/cromanion-challenge.txt`, containing the challenge |
| `meta_tag` | `<meta name="cromanion-site-verification" content="…">` in the page `<head>` |
| `dns_txt` | a TXT record on the apex reading `cromanion-site-verification=…` |

The claim is redeemable for 24 hours. **Opening one creates nothing** — no account, no key, no
charge — so there is no cost to starting and no commitment for your human until the proof is read.

## The order the tools go in

1. **`cromanion_open_claim`** — keep the secret it returns; it is shown once.
2. Publish one of the three proofs it lists. Each comes back with the exact URL and the exact string.
3. **`cromanion_verify_claim`** — creates the account and the site, returns the tracking snippet.
   Safe to retry: a repeat gives you the same account, never a second one.
4. Install the returned snippet before `</body>` on every page. Do not build one yourself — the one
   we return carries the real key and the right hosts.
5. **`cromanion_site_status`** — poll until `install.verified` is true. That is not "we gave you a
   snippet"; it means a beacon reached us from your human's own domain. If it stays false,
   `install.lastBeaconOrigin` names the host we *did* hear from, which is usually the whole answer.

Then the work itself. Call **`cromanion_grants`** first: it tells you which capabilities your human
has allowed, so you read your permissions rather than discovering them by failing in front of them.
They can see everything you did, and revoke you, from one screen.

## Tools

Every tool carries parameter descriptions, an output schema, and behaviour annotations. The
**Effect** column is `readOnlyHint` / `destructiveHint`; **Repeatable** is `idempotentHint`, claimed
only where the implementation guarantees it.

<!-- tools:start -->

_17 tools, read from https://cromanion.com/api/mcp on 2026-09-06._

| Tool | Effect | Repeatable | What it does |
| --- | --- | --- | --- |
| `cromanion_open_claim` | writes | no | Start signing your human up for Cromanion (the autonomous conversion agent) on a site you manage. |
| `cromanion_verify_claim` | writes | yes | Redeem a claim once you have published one of its three proofs (a /.well-known file, a &lt;meta&gt; tag, or a DNS TXT record). |
| `cromanion_site_status` | read | no | Check the site you provisioned: whether the tag is actually live (a beacon received from your own domain, not merely a snippet handed to you), how the crawl is going, and the plan. |
| `cromanion_upgrade_link` | writes | no | Get a Stripe Checkout link for a paid plan (pro or growth). |
| `cromanion_grants` | read | no | List what your human has allowed this agent to do, and what they have not. |
| `cromanion_pending` | read | no | Everything on this site that is waiting for a decision: page rewrites the agent wants to make, rules it distilled from real sessions, conversions it spotted but has never counted, and pages your traffic found that the crawl missed. |
| `cromanion_decide` | writes | yes | Rule on one thing from cromanion_pending: pass its `kind` and `id` back unchanged with a decision. |
| `cromanion_impact` | read | no | What the agent has actually changed: visitors who saw it versus the 10% held back as a control. |
| `cromanion_set_mode` | writes | yes | Switch the agent on. |
| `cromanion_add_goal` | writes | yes | Define a conversion to count. |
| `cromanion_crawl` | writes | no | Re-read the site, and name the pages that matter most so they are read first. |
| `cromanion_claim_domain` | **replaces** | yes | Claim another host for this site so its traffic counts, or give one up with `remove: true`. |
| `cromanion_set_voice` | **replaces** | yes | Write the facts the agent may state to visitors, and the things it must never say. |
| `cromanion_surfaces` | **replaces** | yes | Choose where the agent may speak and what those places look like: which layout surfaces are enabled, whether the exit modal is allowed, custom CSS, and per-surface HTML. |
| `cromanion_set_holdout` | **replaces** | yes | Set the share of visitors held back from the agent so its effect stays measurable (0.05–0.5). |
| `cromanion_set_brand` | writes | yes | Adjust the palette, fonts and button styling the agent paints its surfaces with. |
| `cromanion_lead_destination` | **replaces** | yes | Set where captured leads are delivered: an https webhook, a connected HubSpot portal, or off. |

<!-- tools:end -->

Regenerate this table from the live server:

```bash
node scripts/refresh-tools.mjs
```

## Protocol

Streamable HTTP, POST only. The server currently speaks the `initialize` handshake of protocol
version **`2025-06-18`**. Support for the per-request metadata of `2026-07-28` — and the
`server/discover` that goes with it — is built and awaiting deploy; this section will say so once it
is live rather than before.

It never pushes, so every request is answered with a single JSON object rather than an SSE stream.
There is no stream endpoint and there are no sessions: the server neither mints nor echoes
`Mcp-Session-Id`, and `Last-Event-ID` is ignored.

Ask the server rather than trusting this paragraph:

```bash
curl -s -X POST https://cromanion.com/api/mcp \
  -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"you","version":"1"}}}'
```

## Refusals

Every refusal carries a machine token in `error` and a sentence in `message` you can repeat to your
human verbatim. Three are worth knowing before you meet them:

| Token | Means |
| --- | --- |
| `email_in_use` | That address already has an account. Controlling a site proves nothing about who owns a mailbox, so we will not attach an install to an existing account on the strength of a typed address. Your human signs in and adds the site. |
| `domain_taken` | Another account already has a live tag on that domain. Two tags means two control groups, and then neither side can prove what it changed. |
| `insufficient_grant` | Your human has not allowed this capability. `neededGrant` names it; `cromanion_grants` lists what you do hold. |

## Support

- Product and API questions: <support@cromanion.com>
- Full agent reference: <https://cromanion.com/agents>
