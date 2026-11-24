# Cromanion MCP server

[![Cromanion MCP connector](https://glama.ai/mcp/connectors/com.cromanion/cromanion/badges/score.svg)](https://glama.ai/mcp/connectors/com.cromanion/cromanion)

A site pastes one tag. Cromanion reads the site, watches every visit live, and turns the raw
events into a short, readable story of each visit. One server gives an agent two things to do with
that:

- **Read the visits.** On a Live Visit Feed site, see who is on the site now, read one visit's story
  and score, see which sections of a page visitors study, and list the AI agents that visited.
- **Run the conversion agent.** On a site you manage for someone, set Cromanion up, decide what it
  may say, and let it help the visits worth helping. Its effect is measured against a permanent
  holdout, a share of visitors it never acts on.

This repository is the public documentation for its **remote MCP server**. The product's source is
private; what is here is everything you need to connect to and use the server, plus a script that
regenerates the tool reference from the live endpoint so it cannot quietly go stale.

- **Endpoint:** `https://cromanion.com/api/mcp` — Streamable HTTP, POST only, stateless
- **Docs for agents:** <https://cromanion.com/agents>
- **Developer docs (Live Visit Feed):** <https://cromanion.com/developers>
- **Official MCP registry:** `com.cromanion/cromanion`
- **Smithery:** [cromanion/cromanion](https://smithery.ai/server/cromanion/cromanion)

## Who this is for

- **A developer, or the agent working for one,** who wants live visits from their own site: the
  four Live Visit Feed tools.
- **An AI agent that manages a website for someone else.** It can set Cromanion up for its human
  without them opening a screen, then do the work they have delegated to it.

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

You can connect with **no `Authorization` header**. `initialize`, `tools/list` and
`cromanion_open_claim` need no credential. Every other tool takes `Authorization: Bearer …`, with
one of two credentials:

- **An API key** from the developer console (<https://cromanion.com/dev/keys>), for the Live Visit
  Feed tools. A key reaches the one site it was made for.
- **A conversion credential**, for the conversion tools: the claim secret `cromanion_open_claim`
  issues, or one your human creates in their console (Account → AI agents → Connect an agent).

The credential never goes in a tool argument. It is a transport credential, and an argument is part
of your own conversation, which is the last place a secret should be written down.

## Live Visit Feed

Create a site at <https://cromanion.com/dev/new>, paste its tag, turn the feed on, and create an
API key. Then:

- **`list_live_visits`** lists the visits on the site right now. A visit is listed once it makes a
  real gesture or converts, never a bounce, a crawler or a driven browser.
- **`get_visit`** returns one visit's latest event: its story, attention and signals, and its score
  if the site turned scoring on.
- **`get_page_attention`** adds up which sections of one page visitors study.
- **`list_agent_visits`** lists the AI agents that visited, and says how each one's identity was
  proven.

A conversion credential is refused on these tools with `not_feed_site`. The same events also
arrive as a stream and as a signed webhook; see <https://cromanion.com/developers>.

## The conversion agent

### Two things you cannot do

**You cannot pay.** `cromanion_upgrade_link` returns a Stripe link and nothing else. Your human opens
it and enters their own card. Everything else works on the free plan meanwhile.

**You cannot switch the site from `learn` to `act` on your own initiative.** A new site watches real
sessions and shows visitors nothing. Letting an AI speak to visitors in your human's name is your
human's decision — though they can delegate it to you explicitly, and then you may.

### How we know the site is theirs

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

### The order the tools go in

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

_33 tools, read from https://cromanion.com/api/mcp on 2026-11-24._

| Tool | Effect | Repeatable | What it does |
| --- | --- | --- | --- |
| `cromanion_open_claim` | writes | no | Start here, and you need nothing to do it — no API key, no human. |
| `cromanion_verify_claim` | writes | yes | Redeem a claim once you have published one of its three proofs (a /.well-known file, a &lt;meta&gt; tag, or a DNS TXT record). |
| `cromanion_site_status` | read | no | Check the site you provisioned: whether the tag is actually live (a beacon received from your own domain, not merely a snippet handed to you), how the crawl is going, and the plan. |
| `cromanion_install_check` | read | no | Why the tag is not firing. |
| `cromanion_upgrade_link` | writes | no | Get a Stripe Checkout link for a paid plan (pro or growth). |
| `cromanion_errors` | read | no | Every refusal this server can return, and what to do about each. |
| `cromanion_grants` | read | no | List what your human has allowed this agent to do, and what they have not. |
| `cromanion_pending` | read | no | Everything on this site that is waiting for a decision: page rewrites the agent wants to make, rules it distilled from real sessions, conversions it spotted but has never counted, and pages your traffic found that the crawl missed. |
| `cromanion_config` | read | no | Everything IN FORCE on this site: the conversions that count, the facts you may state and the ones forbidden, which surfaces are enabled, the brand, and every distilled rule WITH its status. |
| `cromanion_decide` | writes | yes | Rule on one thing from cromanion_pending: pass its `kind` and `id` back unchanged with a decision. |
| `cromanion_set_playbook` | **replaces** | no | Reword a distilled rule, or ask for a fresh distillation. |
| `cromanion_ask_human` | writes | yes | Ask your human for something only they can do, in a place they will actually see it. |
| `cromanion_mark_read` | writes | yes | Mark notifications read once you have passed them on to your human. |
| `cromanion_impact` | read | no | What the agent has actually changed: visitors who saw it versus the 10% held back as a control. |
| `cromanion_visits` | read | no | List your human's recent visits — each with its pages, how it ended, what Cromanion's agent showed or held back, the doubts it read, and the start of the visit's story. |
| `cromanion_visit` | read | no | One visit in full: the story of each page load, every moment Cromanion's agent looked at the visitor and what it decided, what the visitor actually saw, and the doubts it read. |
| `cromanion_live` | read | no | Who is on your human's site right now: each visitor's pages so far, what the agent showed them, and its current reading of them. |
| `get_visit` | read | no | For a Live Visit Feed site: one visit's last feed event, read from the edge while the visit is in progress and from the store after it ends. |
| `list_live_visits` | read | no | For a Live Visit Feed site: the visits on the site right now, from the live board. |
| `get_page_attention` | read | no | For a Live Visit Feed site: which sections of one page its visitors study, added up from the stored feed events. |
| `list_agent_visits` | read | no | For a Live Visit Feed site: the AI agents that visited, newest first, each with the pages it saw and the story of its visit. |
| `cromanion_set_mode` | writes | yes | Switch the agent on. |
| `cromanion_add_goal` | writes | yes | Define a conversion to count, or change one you already defined. |
| `cromanion_crawl` | writes | no | Re-read the site, and name the pages that matter most so they are read first. |
| `cromanion_add_site` | writes | no | Add another of your human's sites to their account, on a plan that allows more than one. |
| `cromanion_claim_domain` | **replaces** | yes | Claim another host for this site so its traffic counts, or give one up with `remove: true`. |
| `cromanion_set_voice` | **replaces** | yes | Write the facts the agent may state to visitors, and the things it must never say. |
| `cromanion_set_surfaces` | **replaces** | yes | Choose where the agent may speak and what those places look like: which layout surfaces are enabled, whether the exit modal is allowed, custom CSS, and per-surface HTML. |
| `cromanion_set_holdout` | **replaces** | yes | Set the share of visitors held back from the agent so its effect stays measurable (0.05–0.5). |
| `cromanion_set_exclusions` | **replaces** | yes | Put an excluded device back into the measurement. |
| `cromanion_set_brand` | writes | yes | Adjust the palette, fonts and button styling the agent paints its surfaces with. |
| `cromanion_set_lead_destination` | **replaces** | yes | Set where captured leads are delivered: an https webhook, a connected HubSpot portal, or off. |
| `cromanion_disconnect_hubspot` | **replaces** | yes | Sever the account's HubSpot connection. |

<!-- tools:end -->

Regenerate this table from the live server:

```bash
node scripts/refresh-tools.mjs
```

## Protocol

Streamable HTTP, POST only, and **dual-era**: the server answers both the `initialize` handshake of
`2025-06-18` and the per-request metadata of `2026-07-28`, choosing by the shape of the request. A
modern client declares its version in `params._meta` and the `MCP-Protocol-Version` header;
`server/discover` reports what is supported.

An unsupported version comes back as `400` with `-32022` and the list of versions we do speak, rather
than the undefined behaviour the spec warns a legacy-only server produces.

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
human verbatim. Four are worth knowing before you meet them. `cromanion_errors` lists all of them:

| Token | Means |
| --- | --- |
| `email_in_use` | That address already has an account. Controlling a site proves nothing about who owns a mailbox, so we will not attach an install to an existing account on the strength of a typed address. Your human signs in and adds the site. |
| `domain_taken` | Another account already has a live tag on that domain. Two tags means two control groups, and then neither side can prove what it changed. |
| `insufficient_grant` | Your human has not allowed this capability. `neededGrant` names it; `cromanion_grants` lists what you do hold. |
| `not_feed_site` | A Live Visit Feed tool was called with a conversion credential. Use an API key from the developer console. |

## Support

- Product and API questions: <support@cromanion.com>
- Full agent reference: <https://cromanion.com/agents>
