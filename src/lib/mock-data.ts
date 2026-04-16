import type { Contact } from "@/types/contact";
import type { Interaction } from "@/types/interaction";
import type { Section } from "@/types/section";

// ─────────────────────────────────────────────────────────────
// SECTIONS
// ─────────────────────────────────────────────────────────────

export const mockSections: Section[] = [
  // ─── Lisa Chen (contact-1) ───────────────────────────────
  {
    id: "section-1-profile",
    contact_id: "contact-1",
    slug: "profile",
    title: "Profile",
    summary: "VP of Engineering at NovaTech, decision-maker for infrastructure spend up to $500K.",
    content_md: `## Lisa Chen
**VP of Engineering** at NovaTech (Shenzhen)

Lisa leads a 400-person engineering org focused on NovaTech's cloud platform migration. She has a CS background from Tsinghua University and 12 years of engineering leadership experience at Alibaba and ByteDance before joining NovaTech.

**Key facts:**
- Decision-making authority for infrastructure spend up to $500K
- Technical background — prefers detailed architecture discussions
- Strong preference for vendors with SOC 2 Type II certification
- Reaches out via LinkedIn or WeChat; responds within 24 hours

**Contact:**
- Email: lisa.chen@novatech.com
- LinkedIn: linkedin.com/in/lisachen-novatech
- Phone: +86 755 8800 1234`,
    regenerated_at: "2026-04-14T08:00:00Z",
    interaction_count: 4,
  },
  {
    id: "section-1-company",
    contact_id: "contact-1",
    slug: "company",
    title: "Company",
    summary: "NovaTech is a Series B AI/SaaS company in Shenzhen building enterprise supply chain tools.",
    content_md: `## NovaTech
**AI/SaaS · Series B · Shenzhen**

NovaTech develops enterprise AI tooling for manufacturing supply chains. Their flagship product, NovaSuite, integrates with SAP and Oracle systems.

**Funding:** Series B (2024) · $45M raised · Investors: Sequoia China, IDG Capital

**Size:** ~105,000 employees across China, Singapore, and Germany

**Recent:** Announced Q1 2026 expansion into Southeast Asia. CTO publicly discussing AI infrastructure overhaul on LinkedIn. Listed as one of Forbes Asia's top 10 B2B SaaS companies to watch.

**Tech stack:** AWS (primary), Alibaba Cloud (China region), PostgreSQL, Kubernetes, Python/Go microservices`,
    regenerated_at: "2026-04-14T08:00:00Z",
    interaction_count: 4,
  },
  {
    id: "section-1-outreach",
    contact_id: "contact-1",
    slug: "outreach",
    title: "Outreach",
    summary: "Met at SaaStr Shanghai; proposal sent, budget Q1-approved. Final revision needed before Fri.",
    content_md: `## Outreach History

**First contact:** March 18, 2026 — Met at SaaStr Shanghai Day 2. Lisa approached our booth after the AI-in-manufacturing panel. 30-minute conversation about cloud migration challenges. Exchanged WeChat contacts.

**Follow-up:** March 22, 2026 — Sent intro deck via email. Lisa confirmed budget approval for Q1 infrastructure spend.

**Proposal stage:** April 8, 2026 — Sent initial proposal covering cloud migration accelerator package ($120,000). Lisa responded within 2 hours requesting revised pricing for a phased rollout option.

**Current ask:** Revised proposal with phased pricing due by April 18. Lisa has signaled the deal is progressing to legal review pending the revised doc.

**Communication preferences:** Email for formal docs, WeChat for quick questions. Best window: 9–11am CST.`,
    regenerated_at: "2026-04-14T08:00:00Z",
    interaction_count: 4,
  },
  {
    id: "section-1-followup",
    contact_id: "contact-1",
    slug: "follow-up",
    title: "Follow-up",
    summary: "Send revised phased-pricing proposal by April 18; check in post-legal review April 25.",
    content_md: `## Follow-up Plan

**Immediate (by April 18):**
- Send revised proposal with phased rollout pricing (3-month, 6-month, 12-month tiers)
- Include SOC 2 Type II certification documentation Lisa requested
- CC legal@novatech.com as Lisa instructed

**Short-term (April 25):**
- Check in after legal review
- Ask if procurement needs additional vendor questionnaire
- Confirm expected_close timeline vs. May 15 target

**Ongoing:**
- Keep Lisa in the loop on any product updates relevant to manufacturing supply chains
- Share case study from similar Series B deployment (Finova case study is a good match)

**Risk flags:**
- Competing vendor (Dataiku) is also in final eval — Lisa mentioned this offhand on April 8
- Legal review may push close date past May 15`,
    regenerated_at: "2026-04-14T08:00:00Z",
    interaction_count: 4,
  },
  {
    id: "section-1-research",
    contact_id: "contact-1",
    slug: "research",
    title: "Research",
    summary: "NovaTech Q1 2026 expansion into SEA; CTO's public AI infra comments signal genuine urgency.",
    content_md: `## Research Notes

**Company news (AI-sourced, April 2026):**
- NovaTech announced SEA expansion Feb 2026; Singapore office opens Q2
- Filed 3 AI-related patents in Jan–Mar 2026 covering supply chain anomaly detection
- Revenue run rate reported at ~$120M ARR (Series B deck leak, TechCrunch Asia)

**Lisa Chen – public presence:**
- Published LinkedIn article "Why SOC 2 is Table Stakes for Enterprise AI" (March 2026) — directly relevant to our pitch
- Speaker at SaaStr Shanghai 2026 and ChinaJoy Tech Summit 2025
- Quoted in SCMP piece on enterprise cloud migration trends

**Competitive landscape:**
- Dataiku confirmed in final eval (Lisa mentioned during April 8 call)
- Palantir reportedly lost eval in Feb — NovaTech wanted faster implementation
- Our differentiation: faster onboarding (4 weeks vs. Dataiku's 12), native Chinese-language support

**LinkedIn activity (last 30 days):**
- 3 posts about AI infrastructure investment
- Engaged with posts from AWS China and Alibaba Cloud enterprise accounts`,
    regenerated_at: "2026-04-14T08:00:00Z",
    interaction_count: 4,
  },

  // ─── Marcus Johnson (contact-2) ─────────────────────────
  {
    id: "section-2-profile",
    contact_id: "contact-2",
    slug: "profile",
    title: "Profile",
    summary: "Head of Partnerships at Synapse Labs; fast responder, owns channel partner strategy.",
    content_md: `## Marcus Johnson
**Head of Partnerships** at Synapse Labs (Singapore)

Marcus built and runs the partnerships function at Synapse Labs. He has a background in investment banking (Goldman Sachs Asia, 3 years) before transitioning to tech. He is known for being direct, analytical, and closing deals fast.

**Key facts:**
- Owns channel partner and reseller strategy for APAC
- Authority to sign partnership agreements up to $50K without board approval
- Prefers a clear business case with ROI numbers
- Very fast email/Slack responder; typically replies within 2 hours during business hours

**Contact:**
- Email: marcus.j@synapselabs.io
- LinkedIn: linkedin.com/in/marcusjohnsonsg
- Phone: +65 9101 2233`,
    regenerated_at: "2026-04-13T12:00:00Z",
    interaction_count: 3,
  },
  {
    id: "section-2-company",
    contact_id: "contact-2",
    slug: "company",
    title: "Company",
    summary: "Synapse Labs is a Series A FinTech in Singapore building AI-powered compliance tooling for banks.",
    content_md: `## Synapse Labs
**FinTech · Series A · Singapore**

Synapse Labs develops AI-powered compliance and regulatory reporting tools for mid-size banks and credit unions across Southeast Asia. Their core product automates KYC/AML workflows.

**Funding:** Series A (2025) · $18M raised · Investors: Vertex Ventures, Monk's Hill Ventures

**Size:** ~85 employees; primarily engineering and GTM roles

**Recent:** Signed MAS Regulatory Sandbox approval in Jan 2026. Currently expanding into Indonesia and Vietnam. Hiring aggressively for enterprise sales roles.

**Tech stack:** GCP, Python, Tensorflow, React, PostgreSQL`,
    regenerated_at: "2026-04-13T12:00:00Z",
    interaction_count: 3,
  },
  {
    id: "section-2-outreach",
    contact_id: "contact-2",
    slug: "outreach",
    title: "Outreach",
    summary: "Business card scan at FinTech Festival; follow-up call confirmed partnership interest.",
    content_md: `## Outreach History

**First contact:** March 5, 2026 — Business card exchanged at Singapore FinTech Festival. Marcus stopped by our demo booth and asked pointed questions about API documentation and onboarding support.

**Voice memo follow-up:** March 7, 2026 — Left a voice note walking through our partnership tier structure. Marcus responded same day with specific questions about revenue share model.

**Meeting:** March 28, 2026 — 45-minute video call. Discussed partnership structure, co-marketing opportunities, and integration requirements. Marcus shared their current partner stack and identified 3 gaps our product could fill.

**Next step agreed:** Marcus will bring a partnership proposal draft to his CEO by April 20. We agreed to reconvene April 22 to finalize terms.`,
    regenerated_at: "2026-04-13T12:00:00Z",
    interaction_count: 3,
  },
  {
    id: "section-2-followup",
    contact_id: "contact-2",
    slug: "follow-up",
    title: "Follow-up",
    summary: "Check in April 22 after Marcus presents to CEO; have revenue share counter-proposal ready.",
    content_md: `## Follow-up Plan

**April 22:**
- Reconnect call; Marcus should have CEO feedback by then
- Have revenue share counter-proposal ready (current ask: 20% rev share; we can move to 18% with volume commitment)
- Prepare co-marketing one-pager showing MAS sandbox co-branding opportunity

**If deal advances:**
- Introduce Marcus to our technical integrations team for API onboarding timeline
- Set up shared Slack channel for ongoing partnership comms

**Risk flags:**
- CEO approval required; unknown timeline risk
- Marcus hinted a competing FinTech CRM vendor is also pitching a partnership`,
    regenerated_at: "2026-04-13T12:00:00Z",
    interaction_count: 3,
  },
  {
    id: "section-2-research",
    contact_id: "contact-2",
    slug: "research",
    title: "Research",
    summary: "Synapse Labs in MAS sandbox; Series B fundraise expected H2 2026 — timing favors partnership now.",
    content_md: `## Research Notes

**Company news (AI-sourced):**
- MAS Regulatory Sandbox approval Jan 2026 is a major credibility boost; first FinTech in their cohort to pass KYC stress tests
- DealStreetAsia reports Synapse Labs may raise Series B H2 2026; current ARR ~$8M growing 15% MoM
- Shortlisted for MAS FinTech Award 2026 in the RegTech category

**Marcus Johnson – public presence:**
- Active on LinkedIn; posts about RegTech and ASEAN compliance
- Spoken at 3 FinTech events in 2025–2026
- Previously at Goldman Sachs Asia (Fixed Income Technology)

**Partnership opportunity analysis:**
- Our integration would give Synapse Labs a CRM-to-compliance workflow their competitors lack
- High strategic value: we get access to their bank client network (~40 active accounts)
- Co-marketing with MAS sandbox badge is a strong signal for other bank prospects`,
    regenerated_at: "2026-04-13T12:00:00Z",
    interaction_count: 3,
  },

  // ─── Sarah Park (contact-3) ──────────────────────────────
  {
    id: "section-3-profile",
    contact_id: "contact-3",
    slug: "profile",
    title: "Profile",
    summary: "Founder & CEO of GrowthOS, a PLG-focused SaaS startup recently closed seed round in Seoul.",
    content_md: `## Sarah Park
**Founder & CEO** at GrowthOS (Seoul)

Sarah founded GrowthOS in 2024 after leading product growth at Krafton. She has a deep PLG background and is building a revenue intelligence platform for early-stage B2B SaaS companies.

**Key facts:**
- Solo founder with 12-person team (8 engineers, 4 GTM)
- Bootstrapped for 18 months before seed round
- Very hands-on with product; also owns sales pipeline personally at this stage
- Communication preference: async Slack or email; prefers demos over calls

**Contact:**
- Email: sarah@growthos.io
- LinkedIn: linkedin.com/in/sarahpark-growthos`,
    regenerated_at: "2026-04-12T09:00:00Z",
    interaction_count: 2,
  },
  {
    id: "section-3-company",
    contact_id: "contact-3",
    slug: "company",
    title: "Company",
    summary: "GrowthOS is a seed-stage PLG SaaS in Seoul building revenue intelligence for B2B startups.",
    content_md: `## GrowthOS
**SaaS/PLG · Seed · Seoul**

GrowthOS builds a revenue intelligence platform that helps early-stage B2B SaaS companies understand trial-to-paid conversion through behavioral analytics and AI-generated recommendations.

**Funding:** Seed (closed March 2026) · $2.5M raised · Investors: SparkLabs Korea, Kakao Ventures

**Size:** 12 employees

**Product:** Web app + Slack bot integration. Core metrics: trial activation rate, PQL scoring, expansion revenue tracking.

**Recent:** Just closed seed round in March 2026. Using capital for engineering hires and first enterprise go-to-market push. Product-market fit signals strong among 18 pilot customers.`,
    regenerated_at: "2026-04-12T09:00:00Z",
    interaction_count: 2,
  },
  {
    id: "section-3-outreach",
    contact_id: "contact-3",
    slug: "outreach",
    title: "Outreach",
    summary: "Connected via mutual intro; text note exchanged, voice memo sent. Awaiting demo scheduling.",
    content_md: `## Outreach History

**First contact:** March 30, 2026 — Intro via Jenny Kim (SparkLabs portfolio manager). Sarah replied within 4 hours expressing interest in seeing a demo.

**Text note (April 2, 2026):** Sent a short note with product positioning for early-stage SaaS companies. Sarah appreciated the relevance and asked if we support Slack-native workflows.

**Voice memo (April 8, 2026):** Recorded a 3-minute product overview addressing her Slack question. Sarah responded positively but has not yet scheduled a formal demo — she mentioned closing a round was taking all her bandwidth.

**Status:** Warm lead, waiting for her bandwidth to open post-seed-close.`,
    regenerated_at: "2026-04-12T09:00:00Z",
    interaction_count: 2,
  },
  {
    id: "section-3-followup",
    contact_id: "contact-3",
    slug: "follow-up",
    title: "Follow-up",
    summary: "Reach out late April after seed close dust settles; offer async demo recording.",
    content_md: `## Follow-up Plan

**Late April (after April 20):**
- Send a brief congrats note on the seed close (public news)
- Offer an async Loom demo she can watch on her schedule
- Ask if she'd like to trial with one of her pilot customers for free for 30 days

**If she engages:**
- Set up a 30-minute product demo with her and her head of product
- Position us as a tool that could accelerate their enterprise motion

**Pricing context:**
- At 12 employees, deal value will be small ($0–$15K range)
- This is a relationship/pipeline investment for future upsell when they grow`,
    regenerated_at: "2026-04-12T09:00:00Z",
    interaction_count: 2,
  },
  {
    id: "section-3-research",
    contact_id: "contact-3",
    slug: "research",
    title: "Research",
    summary: "GrowthOS just closed $2.5M seed (March 2026); strong PLG signal with 18 pilot customers.",
    content_md: `## Research Notes

**Company news (AI-sourced):**
- Seed round announced April 1, 2026 on TechCrunch Korea — $2.5M from SparkLabs and Kakao Ventures
- 18 pilot customers including Wanted Lab, Riiid, and 3 unnamed K-SaaS companies
- GrowthOS was featured in Hacker News "Show HN" in Jan 2026 with 180+ upvotes

**Sarah Park – public presence:**
- 4,500 LinkedIn followers; posts about PLG, product analytics, and startup survival
- Contributor to Korean SaaS newsletter "SaaSy Korea"
- Guest on two Korean startup podcasts in 2025

**Competitive context:**
- Competes with Amplitude, Mixpanel, and a Korean startup called Nudge (also in SparkLabs portfolio)
- GrowthOS differentiates on AI recommendations vs. pure analytics
- At seed stage, budget sensitivity is high — free trial or low entry price needed`,
    regenerated_at: "2026-04-12T09:00:00Z",
    interaction_count: 2,
  },

  // ─── David Huang (contact-4) ─────────────────────────────
  {
    id: "section-4-profile",
    contact_id: "contact-4",
    slug: "profile",
    title: "Profile",
    summary: "VP Sales at CloudScale, a publicly traded cloud infrastructure company in Hong Kong.",
    content_md: `## David Huang
**VP Sales** at CloudScale (Hong Kong)

David runs enterprise sales for CloudScale's APAC region, covering deals from $100K to $5M. He joined CloudScale from AWS Greater China in 2023 and has a reputation for rigorous procurement processes.

**Key facts:**
- Enterprise sales authority; procurement cycles typically 90–180 days
- Very formal communication style; prefers structured proposals with clear ROI models
- Has a team of 12 AEs; he personally engages for deals >$150K
- Likely will require security questionnaire and legal review before any pilot

**Contact:**
- Email: d.huang@cloudscale.hk
- LinkedIn: linkedin.com/in/davidhuangcloudscale`,
    regenerated_at: "2026-04-10T14:00:00Z",
    interaction_count: 2,
  },
  {
    id: "section-4-company",
    contact_id: "contact-4",
    slug: "company",
    title: "Company",
    summary: "CloudScale is a publicly traded cloud infrastructure company in HK with 3,400 employees.",
    content_md: `## CloudScale
**Cloud Infrastructure · Public · Hong Kong**

CloudScale is a publicly listed cloud infrastructure company (HKEX: 9988) providing managed cloud, CDN, and enterprise connectivity services across Asia. They compete with AWS and Alibaba Cloud in the mid-market enterprise segment.

**Funding:** Public (IPO 2022) · Market cap ~HK$12B

**Size:** ~3,400 employees across Hong Kong, Singapore, Taiwan, Japan

**Revenue:** ~$380M ARR; Q1 2026 earnings call flagged "infrastructure tooling" as a priority investment area

**Tech stack:** Own proprietary cloud infrastructure; Oracle ERP; Salesforce CRM`,
    regenerated_at: "2026-04-10T14:00:00Z",
    interaction_count: 2,
  },
  {
    id: "section-4-outreach",
    contact_id: "contact-4",
    slug: "outreach",
    title: "Outreach",
    summary: "Imported from LinkedIn; AI research completed. No direct contact yet — cold outreach needed.",
    content_md: `## Outreach History

**Imported:** April 5, 2026 — Contact imported from LinkedIn Sales Navigator export. No prior interaction.

**AI Research completed:** April 10, 2026 — Web research surfaced relevant context: David's focus on APAC enterprise, Q1 2026 earnings commentary on tooling investment.

**Status:** New lead — no direct contact established yet. Need to craft a personalized cold outreach email.

**Recommended approach:**
- Reference CloudScale Q1 earnings commentary specifically
- Lead with enterprise case study (NovaTech or similar size)
- Offer a 20-minute ROI conversation, not a full demo`,
    regenerated_at: "2026-04-10T14:00:00Z",
    interaction_count: 2,
  },
  {
    id: "section-4-followup",
    contact_id: "contact-4",
    slug: "follow-up",
    title: "Follow-up",
    summary: "Draft cold outreach referencing Q1 earnings call; target initial 20-min intro call.",
    content_md: `## Follow-up Plan

**Immediate:**
- Draft personalized cold email referencing CloudScale's Q1 2026 earnings commentary on infrastructure tooling investment
- Keep email under 150 words; include one specific data point from their earnings call
- Send Tuesday morning HKT for best open rate

**If no response in 5 business days:**
- LinkedIn InMail as secondary touch
- Reference mutual connection if findable (check LinkedIn mutuals)

**If they respond:**
- Offer 20-minute "ROI hypothesis" call — not a demo, just a conversation
- Prepare CloudScale-specific pricing model in advance

**Deal qualification:**
- Budget: $200K deal value estimated based on company size
- Timeline: 90–180 day procurement expected
- Champion: need to find internal champion below David; likely a Director of IT or Cloud Architect`,
    regenerated_at: "2026-04-10T14:00:00Z",
    interaction_count: 2,
  },
  {
    id: "section-4-research",
    contact_id: "contact-4",
    slug: "research",
    title: "Research",
    summary: "CloudScale Q1 2026 call flagged tooling investment; HKEX filings show infrastructure capex up 22% YoY.",
    content_md: `## Research Notes

**Company news (AI-sourced, April 2026):**
- CloudScale Q1 2026 earnings call (April 3): CFO mentioned "operational tooling and workflow automation" as a priority capex area for H1 2026 — budget likely available
- HKEX annual filing: infrastructure capex up 22% YoY; technology headcount grew 18%
- Shortlisted for HK ICT Awards 2026 in Cloud Platforms category

**David Huang – public presence:**
- Low LinkedIn activity (posts ~1x/month); primarily shares CloudScale press releases
- Presented at Gartner IT Symposium Asia 2025 on "Enterprise Cloud Migration at Scale"
- No conference appearances scheduled for H1 2026 (per event sites)

**Competitive context:**
- CloudScale currently uses Salesforce; migration to a lighter CRM is rumored internally (Glassdoor mention)
- Strong procurement gate — expect RFP if deal advances past initial interest
- Internal champion needed; David is the executive sponsor but not the day-to-day contact`,
    regenerated_at: "2026-04-10T14:00:00Z",
    interaction_count: 2,
  },

  // ─── Emma Rodriguez (contact-5) ──────────────────────────
  {
    id: "section-5-profile",
    contact_id: "contact-5",
    slug: "profile",
    title: "Profile",
    summary: "Director of Product at Nexus AI — closed deal, now a reference customer and expansion target.",
    content_md: `## Emma Rodriguez
**Director of Product** at Nexus AI (Beijing)

Emma leads product management for Nexus AI's enterprise ML platform. She championed the evaluation process internally and was the primary decision-maker for our platform purchase. She is now a power user and strong advocate.

**Key facts:**
- Closed deal ($80,000 annual contract) — signed March 15, 2026
- Product champion who ran 6-week internal evaluation
- Deep technical understanding; engages with engineering teams directly
- High NPS scorer — rated our onboarding 9/10 in first-week survey

**Contact:**
- Email: emma.r@nexus.ai
- LinkedIn: linkedin.com/in/emmarodriguez-nexus
- WeChat: emma_nexus_ai`,
    regenerated_at: "2026-04-15T10:00:00Z",
    interaction_count: 4,
  },
  {
    id: "section-5-company",
    contact_id: "contact-5",
    slug: "company",
    title: "Company",
    summary: "Nexus AI is a Series C ML platform company in Beijing with 620 employees and strong revenue growth.",
    content_md: `## Nexus AI
**AI/ML · Series C · Beijing**

Nexus AI builds an end-to-end ML platform for enterprise clients across financial services, healthcare, and logistics. Their platform handles model training, deployment, and monitoring at scale.

**Funding:** Series C (2025) · $120M raised · Investors: Tiger Global, GGV Capital, Tencent

**Size:** ~620 employees across Beijing, Shanghai, and a newly opened Singapore office

**Revenue:** ~$60M ARR; growing 40% YoY

**Recent:** Launched Nexus ML Cloud (public SaaS version) in Q1 2026. Announced partnership with NVIDIA for H100 cluster integration. Emma's team owns the enterprise product line.`,
    regenerated_at: "2026-04-15T10:00:00Z",
    interaction_count: 4,
  },
  {
    id: "section-5-outreach",
    contact_id: "contact-5",
    slug: "outreach",
    title: "Outreach",
    summary: "Deal closed March 15; strong post-sale engagement. Emma is now an active reference customer.",
    content_md: `## Outreach History

**Initial evaluation:** January–March 2026 — Emma ran a 6-week technical evaluation with her engineering team. We provided sandbox access, weekly check-ins, and a custom integration POC.

**Closed:** March 15, 2026 — $80,000 annual contract signed. Emma personally approved the PO.

**Post-sale (March 22):** Kick-off call with Emma and 3 team members. Onboarding rated 9/10.

**Follow-up done (April 1):** Emma confirmed they've rolled out to the full product team. Mentioned they're already seeing value in the relationship tracking workflows.

**Reference call:** Emma agreed to be a reference customer and speak on our behalf for 1–2 prospect calls per quarter.

**Expansion signals:** In April 8 conversation, Emma mentioned the sales team is interested in using the tool. Potential expansion opportunity.`,
    regenerated_at: "2026-04-15T10:00:00Z",
    interaction_count: 4,
  },
  {
    id: "section-5-followup",
    contact_id: "contact-5",
    slug: "follow-up",
    title: "Follow-up",
    summary: "Pursue sales team expansion ($20–30K uplift); ask Emma for a case study quote.",
    content_md: `## Follow-up Plan

**Short-term (by April 25):**
- Follow up on sales team expansion interest (could be $20–30K uplift)
- Ask Emma if she'd be willing to provide a written case study quote for our website
- Schedule QBR call for end of May (first 90-day check-in)

**Reference management:**
- Add Emma to reference customer Slack channel
- Brief her before any reference call with prospect profile and key questions
- Send a thank-you gift (handwritten note + small APAC-appropriate gift) for her advocacy

**Expansion roadmap:**
- Q3 2026: Sales team expansion ($20K estimate)
- Q4 2026: Potential platform-wide rollout across all 620 employees
- 12-month expansion target: $150K total ARR from Nexus AI

**Health check:**
- Current usage: strong (daily active usage per onboarding dashboard)
- Risk: low — Emma is deeply engaged`,
    regenerated_at: "2026-04-15T10:00:00Z",
    interaction_count: 4,
  },
  {
    id: "section-5-research",
    contact_id: "contact-5",
    slug: "research",
    title: "Research",
    summary: "Nexus AI Series C well-funded; NVIDIA partnership and ML Cloud launch create expansion context.",
    content_md: `## Research Notes

**Company news (AI-sourced):**
- Nexus ML Cloud public launch (Q1 2026) signals shift toward broader market; product team will be busy
- NVIDIA H100 partnership announced March 2026 — Nexus AI is investing heavily in infrastructure
- Series C $120M (mid-2025); runway 4+ years; no fundraising pressure

**Emma Rodriguez – public presence:**
- 8,200 LinkedIn followers; posts about ML product management, AI infrastructure, and team culture
- Speaker at PyCon China 2025 and AI Summit Beijing 2025
- Quoted in TechNode article on enterprise ML adoption (Feb 2026)
- Active open source contributor to ML monitoring tools on GitHub

**Expansion signals:**
- Emma mentioned sales team interest on April 8
- Nexus AI headcount grew 25% in 2025 — more team members = more seats
- NVIDIA partnership likely means new internal workflows that could benefit from our product`,
    regenerated_at: "2026-04-15T10:00:00Z",
    interaction_count: 4,
  },

  // ─── James Wei (contact-6) ───────────────────────────────
  {
    id: "section-6-profile",
    contact_id: "contact-6",
    slug: "profile",
    title: "Profile",
    summary: "CTO at BlockBridge; relationship has gone cold since Dec 2025, market headwinds in Web3.",
    content_md: `## James Wei
**CTO** at BlockBridge (Shanghai)

James is the technical co-founder and CTO of BlockBridge, a Web3 infrastructure company building cross-chain settlement tools for institutional traders. He has a PhD from Fudan University in distributed systems.

**Key facts:**
- Technical co-founder; deep expertise in cryptography and consensus mechanisms
- Has historically been slow to respond during market downturns
- Very interested in open-source and dev tool integrations
- Last meaningful conversation: November 2025 at Web3 Summit Shanghai

**Contact:**
- Email: james@blockbridge.xyz
- LinkedIn: linkedin.com/in/jamesweiblockbridge
- Telegram: @jameswei_bb`,
    regenerated_at: "2026-04-01T08:00:00Z",
    interaction_count: 2,
  },
  {
    id: "section-6-company",
    contact_id: "contact-6",
    slug: "company",
    title: "Company",
    summary: "BlockBridge is a Series A Web3 company in Shanghai facing challenging market conditions.",
    content_md: `## BlockBridge
**Web3/Blockchain · Series A · Shanghai**

BlockBridge builds cross-chain settlement infrastructure for institutional crypto traders and DeFi protocols. Their core product enables atomic swaps across 8 major blockchains with sub-second finality.

**Funding:** Series A (2023) · $12M raised · Investors: HashKey Capital, Folius Ventures

**Size:** ~45 employees

**Recent:** Web3 market has been in a prolonged correction since Q3 2025. BlockBridge paused hiring in October 2025. CoinDesk reported their B2B revenue declined 30% YoY. New product pivot to "institutional custody infrastructure" announced February 2026 — strategic shift away from retail DeFi.

**Tech stack:** Rust, Solidity, Go, self-hosted infrastructure`,
    regenerated_at: "2026-04-01T08:00:00Z",
    interaction_count: 2,
  },
  {
    id: "section-6-outreach",
    contact_id: "contact-6",
    slug: "outreach",
    title: "Outreach",
    summary: "Met at Web3 Summit Nov 2025; follow-up skipped Jan 2026. No contact since Dec 2025.",
    content_md: `## Outreach History

**First contact:** September 2025 — Introduction at a Shanghai tech event via mutual contact (Ray Zhang from Folius Ventures).

**Meeting:** November 28, 2025 — 1-hour meeting at Web3 Summit Shanghai. James was interested in our product for managing investor and partner relationships. Good conversation but no clear next step.

**Follow-up skipped:** January 15, 2026 — Skipped planned follow-up due to crypto market conditions. James appeared to be heads-down managing the company through the downturn.

**Status:** Dormant — no contact since December 2025. The prolonged Web3 bear market and their company's strategic pivot have made the timing difficult.`,
    regenerated_at: "2026-04-01T08:00:00Z",
    interaction_count: 2,
  },
  {
    id: "section-6-followup",
    contact_id: "contact-6",
    slug: "follow-up",
    title: "Follow-up",
    summary: "Consider re-engaging Q3 2026 if Web3 market recovers or they complete their institutional pivot.",
    content_md: `## Follow-up Plan

**Re-engagement trigger conditions:**
- Web3 market shows recovery signal (BTC > $120K, ETH > $5K)
- BlockBridge announces institutional product GA or new funding
- James posts on LinkedIn indicating growth optimism

**If re-engaging:**
- Lead with congratulations on institutional pivot — frame it as a new chapter
- Position product as helping manage the institutional partnership network they're building
- Keep email brief; James is likely overwhelmed with the company transition

**Current assessment:**
- Opportunity score: Low (10% probability)
- Budget: No deal value estimated given current company state
- Timeline: Not before Q3 2026 at earliest
- Primary risk: Company may not survive the downturn at current burn rate`,
    regenerated_at: "2026-04-01T08:00:00Z",
    interaction_count: 2,
  },
  {
    id: "section-6-research",
    contact_id: "contact-6",
    slug: "research",
    title: "Research",
    summary: "BlockBridge B2B revenue down 30% YoY; institutional pivot announced Feb 2026 — high uncertainty.",
    content_md: `## Research Notes

**Company news (AI-sourced):**
- CoinDesk article (Feb 2026): BlockBridge B2B revenue down 30% YoY; team downsized from 62 to 45 employees
- Institutional custody pivot announced Feb 18, 2026 — targeting family offices and hedge funds
- No new funding announced; Series A from 2023 likely under pressure with 2-year burn
- HashKey Capital publicly written down their Web3 infrastructure portfolio by 40% (Q4 2025 report)

**James Wei – public presence:**
- LinkedIn activity dropped significantly after Q3 2025 — last post was February 2026 about the institutional pivot
- GitHub activity remains high — still deeply in technical work
- Removed "BlockBridge — transforming DeFi" headline; updated to "Building institutional blockchain infrastructure"

**Market context:**
- Global Web3 VC investment down 65% in 2025 vs. 2024 peak
- Institutional crypto custody is growing — Fidelity Digital Assets, Anchorage growing 40%+ YoY
- BlockBridge's pivot is strategically sound but execution risk is high at 45 employees`,
    regenerated_at: "2026-04-01T08:00:00Z",
    interaction_count: 2,
  },

  // ─── Priya Nair (contact-7) ──────────────────────────────
  {
    id: "section-7-profile",
    contact_id: "contact-7",
    slug: "profile",
    title: "Profile",
    summary: "Head of Sales at TechBridge India; follow-up due tomorrow, high intent channel partner candidate.",
    content_md: `## Priya Nair
**Head of Sales** at TechBridge India (Mumbai)

Priya leads a 15-person sales team at TechBridge India and owns the company's enterprise and channel partner strategy for the Indian subcontinent. She has 11 years of SaaS sales experience including 4 years at Zoho.

**Key facts:**
- Owns enterprise sales + channel partner program for India
- Decision authority for partnership agreements up to $75K
- Extremely organized; uses structured meeting agendas and follow-up docs
- Strong personal network in Indian enterprise SaaS ecosystem

**Contact:**
- Email: priya.nair@techbridge.in
- LinkedIn: linkedin.com/in/priyanair-techbridge
- Phone: +91 98200 45678`,
    regenerated_at: "2026-04-15T14:00:00Z",
    interaction_count: 3,
  },
  {
    id: "section-7-company",
    contact_id: "contact-7",
    slug: "company",
    title: "Company",
    summary: "TechBridge India is a Series B enterprise SaaS company in Mumbai with 230 employees.",
    content_md: `## TechBridge India
**Enterprise SaaS · Series B · Mumbai**

TechBridge India builds workflow automation and ERP integration tools for mid-market Indian enterprises across manufacturing, logistics, and BFSI. They have deep partnerships with Tata Group and Mahindra.

**Funding:** Series B (2025) · $22M raised · Investors: Sequoia India, CRED's Kunal Shah (angel)

**Size:** ~230 employees across Mumbai, Bangalore, and Delhi

**Revenue:** ~$15M ARR; growing 60% YoY

**Recent:** Expanded into UAE and Singapore markets in Q1 2026. Announced Tata Digital partnership (March 2026). Looking aggressively for APAC channel partners to accelerate international expansion.

**Tech stack:** Node.js, React, AWS, PostgreSQL, Salesforce (CRM)`,
    regenerated_at: "2026-04-15T14:00:00Z",
    interaction_count: 3,
  },
  {
    id: "section-7-outreach",
    contact_id: "contact-7",
    slug: "outreach",
    title: "Outreach",
    summary: "Met at SaaStr India; follow-up meeting confirmed partnership interest; follow-up due April 17.",
    content_md: `## Outreach History

**First contact:** April 2, 2026 — Met at SaaStr India Annual in Mumbai. Priya attended our channel partner breakfast roundtable. She introduced herself as "actively looking for APAC SaaS partners."

**Voice memo (April 4, 2026):** Priya left a voice message after the conference expressing strong interest. Mentioned TechBridge India is expanding to Singapore and wants channel partners who understand both markets.

**Meeting (April 10, 2026):** 1-hour video call. Discussed channel partner framework, revenue share model, and co-selling motion. Priya shared their Singapore go-to-market plan and specifically asked about our Singapore customer base.

**Email snippet (April 12, 2026):** Priya sent a detailed follow-up email listing 5 specific integration requirements and asking for our standard partnership agreement template.

**Next step:** Priya asked for a follow-up call on April 17 to review the partnership agreement draft.`,
    regenerated_at: "2026-04-15T14:00:00Z",
    interaction_count: 3,
  },
  {
    id: "section-7-followup",
    contact_id: "contact-7",
    slug: "follow-up",
    title: "Follow-up",
    summary: "Call tomorrow April 17 to review partnership agreement; prepare Singapore customer reference list.",
    content_md: `## Follow-up Plan

**Tomorrow (April 17 — follow-up call scheduled):**
- Review partnership agreement draft with Priya
- Address her 5 integration requirements (from April 12 email)
- Share Singapore customer reference list she requested
- Confirm revenue share structure: our offer is 15% on referred ARR, 20% on co-sold deals

**If call goes well:**
- Set up technical integration scoping call with Priya + TechBridge engineering lead
- Introduce to our Singapore customer success team for market intel sharing
- Target partnership agreement signed by April 30

**If she needs more time:**
- Agree on weekly check-in cadence
- Send full due diligence pack (SOC 2, security questionnaire, case studies)

**Deal context:**
- $60K deal value estimate based on channel commission over 12 months
- 60% probability — high intent but partnership agreements can drag on legal`,
    regenerated_at: "2026-04-15T14:00:00Z",
    interaction_count: 3,
  },
  {
    id: "section-7-research",
    contact_id: "contact-7",
    slug: "research",
    title: "Research",
    summary: "TechBridge India growing 60% YoY; Tata Digital partnership and APAC expansion create strong channel opportunity.",
    content_md: `## Research Notes

**Company news (AI-sourced):**
- TechBridge India × Tata Digital partnership announcement March 12, 2026 — significant credibility boost for enterprise market
- YourStory article (March 2026): TechBridge India targets $50M ARR by 2027; aggressive APAC expansion underway
- Hired 3 enterprise AEs in Singapore in Q1 2026 (LinkedIn job posts); building local sales presence

**Priya Nair – public presence:**
- 6,800 LinkedIn followers; regular poster on B2B SaaS sales and channel strategy
- Speaker at SaaStr India Annual 2026 and SaaSBoomi Chennai 2025
- Co-authored blog post: "Building Channel Partner Programs That Actually Work" (March 2026) — very relevant to this conversation

**Channel partner opportunity:**
- TechBridge India's Singapore expansion is in early stages; they need local market knowledge we can provide
- Their Tata Digital connection could open doors to Tata group enterprise accounts
- Strong strategic fit: their ERP focus + our relationship intelligence = full enterprise workflow stack`,
    regenerated_at: "2026-04-15T14:00:00Z",
    interaction_count: 3,
  },
];

// ─────────────────────────────────────────────────────────────
// INTERACTIONS
// ─────────────────────────────────────────────────────────────

export const mockInteractions: Interaction[] = [
  // ─── Lisa Chen (contact-1) ───────────────────────────────
  {
    id: "interaction-1-1",
    contact_id: "contact-1",
    owner_id: "user-1",
    type: "meeting_note",
    raw_content:
      "Met Lisa Chen at SaaStr Shanghai Day 2. She approached our booth after the AI-in-manufacturing panel. 30-minute conversation. She leads a 400-person eng org at NovaTech, currently mid-cloud-migration. Budget is being confirmed for Q1. She mentioned they need SOC 2 Type II. Exchanged WeChat. Strong interest — follow up next week.",
    media_url: null,
    source_context: "SaaStr Shanghai 2026 — Day 2",
    ai_generated: false,
    created_at: "2026-03-18T15:30:00Z",
  },
  {
    id: "interaction-1-2",
    contact_id: "contact-1",
    owner_id: "user-1",
    type: "voice_memo",
    raw_content:
      "Just got off a quick call with Lisa. She confirmed that NovaTech's Q1 infrastructure budget has been approved — around 500K available for the migration tooling category. She said she's evaluating two other vendors including Dataiku. She wants a revised proposal with phased rollout pricing. Asked me to CC their legal team. Sounding positive.",
    media_url: "https://storage.example.com/voice/interaction-1-2.m4a",
    source_context: null,
    ai_generated: false,
    created_at: "2026-03-22T11:00:00Z",
  },
  {
    id: "interaction-1-3",
    contact_id: "contact-1",
    owner_id: "user-1",
    type: "text_note",
    raw_content:
      "Sent initial proposal to Lisa ($120K for cloud migration accelerator). She responded within 2 hours — loves the approach but needs phased pricing options (3-month, 6-month, 12-month breakdowns). She said legal review will start once they have the revised doc. Feeling good about this one. Deadline: April 18 for revised proposal.",
    media_url: null,
    source_context: null,
    ai_generated: false,
    created_at: "2026-04-08T14:00:00Z",
  },
  {
    id: "interaction-1-4",
    contact_id: "contact-1",
    owner_id: "user-1",
    type: "ai_research",
    raw_content:
      "## NovaTech Research Summary\n\nNovaTech announced Q1 2026 expansion into Southeast Asia. Singapore office opening Q2. Revenue run rate ~$120M ARR per Series B deck leak (TechCrunch Asia). Filed 3 AI patents in Q1 2026. Lisa Chen published LinkedIn article on SOC 2 requirements (March 2026). Competitor Dataiku lost NovaTech eval in Feb (Palantir out). Our differentiation: 4-week onboarding vs. Dataiku's 12-week timeline.",
    media_url: null,
    source_context: "AI web research",
    ai_generated: true,
    created_at: "2026-04-10T09:00:00Z",
  },

  // ─── Marcus Johnson (contact-2) ─────────────────────────
  {
    id: "interaction-2-1",
    contact_id: "contact-2",
    owner_id: "user-1",
    type: "card_scan",
    raw_content:
      "Marcus Johnson\nHead of Partnerships\nSynapse Labs\nmarcos.j@synapselabs.io\n+65 9101 2233\nlinkedin.com/in/marcusjohnsonsg\nSingapore FinTech Festival — Booth 214",
    media_url: "https://storage.example.com/cards/interaction-2-1.jpg",
    source_context: "Singapore FinTech Festival 2026",
    ai_generated: false,
    created_at: "2026-03-05T10:15:00Z",
  },
  {
    id: "interaction-2-2",
    contact_id: "contact-2",
    owner_id: "user-1",
    type: "voice_memo",
    raw_content:
      "Recorded a voice overview for Marcus covering our partnership tier structure — silver, gold, platinum tiers with 15%, 18%, 20% revenue share respectively. Marcus wrote back same day with two questions: (1) what's the minimum commitment period, and (2) do we have MAS-recognized certifications. Fast responder, very analytical. Good sign.",
    media_url: "https://storage.example.com/voice/interaction-2-2.m4a",
    source_context: null,
    ai_generated: false,
    created_at: "2026-03-07T16:00:00Z",
  },
  {
    id: "interaction-2-3",
    contact_id: "contact-2",
    owner_id: "user-1",
    type: "meeting_note",
    raw_content:
      "45-min video call with Marcus. Covered partnership structure, co-marketing, and integration requirements. He shared their current partner stack — they use HubSpot for CRM and have 3 technology integrations. He identified 3 gaps our product fills: (1) relationship intelligence, (2) deal tracking across partners, (3) AI-generated outreach. He'll bring a partnership proposal to his CEO by April 20. We agreed to reconnect April 22.",
    media_url: null,
    source_context: "Video call — Zoom",
    ai_generated: false,
    created_at: "2026-03-28T10:00:00Z",
  },

  // ─── Sarah Park (contact-3) ──────────────────────────────
  {
    id: "interaction-3-1",
    contact_id: "contact-3",
    owner_id: "user-1",
    type: "text_note",
    raw_content:
      "Sarah Park intro via Jenny Kim at SparkLabs. She's the founder of GrowthOS — revenue intelligence for early-stage B2B SaaS. Just closed a seed round. Sent her a short positioning note about how we help founders manage investor and customer relationships. She appreciated the relevance and asked about Slack-native workflows. Very fast responder.",
    media_url: null,
    source_context: "Intro via SparkLabs — Jenny Kim",
    ai_generated: false,
    created_at: "2026-04-02T09:30:00Z",
  },
  {
    id: "interaction-3-2",
    contact_id: "contact-3",
    owner_id: "user-1",
    type: "voice_memo",
    raw_content:
      "Recorded a 3-minute product overview for Sarah specifically addressing the Slack integration question. Explained that our Slack bot can surface follow-up reminders, contact summaries, and meeting prep directly in Slack. She responded positively via text but said she's swamped with the seed close — asked to reconnect in a few weeks. Keeping it warm.",
    media_url: "https://storage.example.com/voice/interaction-3-2.m4a",
    source_context: null,
    ai_generated: false,
    created_at: "2026-04-08T11:30:00Z",
  },

  // ─── David Huang (contact-4) ─────────────────────────────
  {
    id: "interaction-4-1",
    contact_id: "contact-4",
    owner_id: "user-1",
    type: "import",
    raw_content:
      "David Huang\nVP Sales, APAC\nCloudScale\nd.huang@cloudscale.hk\n+852 9876 5432\nlinkedin.com/in/davidhuangcloudscale\nHong Kong\n\nSource: LinkedIn Sales Navigator export — Enterprise Cloud Infrastructure list",
    media_url: null,
    source_context: "LinkedIn Sales Navigator export",
    ai_generated: false,
    created_at: "2026-04-05T08:00:00Z",
  },
  {
    id: "interaction-4-2",
    contact_id: "contact-4",
    owner_id: "user-1",
    type: "ai_research",
    raw_content:
      "## CloudScale Research Summary\n\nCloudScale (HKEX: 9988) Q1 2026 earnings call (April 3): CFO flagged 'operational tooling and workflow automation' as H1 2026 capex priority. Infrastructure capex up 22% YoY per HKEX filing. ~$380M ARR, ~3,400 employees. David Huang joined from AWS Greater China in 2023. Presented at Gartner IT Symposium Asia 2025. Low LinkedIn activity — primarily shares corporate press releases. Glassdoor mentions possible CRM migration away from Salesforce.",
    media_url: null,
    source_context: "AI web research",
    ai_generated: true,
    created_at: "2026-04-10T10:00:00Z",
  },

  // ─── Emma Rodriguez (contact-5) ──────────────────────────
  {
    id: "interaction-5-1",
    contact_id: "contact-5",
    owner_id: "user-1",
    type: "meeting_note",
    raw_content:
      "Kick-off call with Emma and 3 team members (product managers). Deal closed March 15. Emma ran a very organized evaluation — she came with a spreadsheet comparing our product against 2 others across 24 criteria. She won her internal eval and got PO signed in record time. Team onboarding went smoothly. She gave our onboarding process a 9/10.",
    media_url: null,
    source_context: "Post-sale kick-off call",
    ai_generated: false,
    created_at: "2026-03-22T14:00:00Z",
  },
  {
    id: "interaction-5-2",
    contact_id: "contact-5",
    owner_id: "user-1",
    type: "voice_memo",
    raw_content:
      "Quick voice note after talking to Emma informally at an AI event. She mentioned her sales team has been asking about the tool after seeing the product team use it. Could be an expansion opportunity. She said she'd bring it up at their next leadership team meeting. She also mentioned being open to doing a case study for us.",
    media_url: "https://storage.example.com/voice/interaction-5-2.m4a",
    source_context: "AI Summit Beijing 2026 — hallway conversation",
    ai_generated: false,
    created_at: "2026-04-08T18:00:00Z",
  },
  {
    id: "interaction-5-3",
    contact_id: "contact-5",
    owner_id: "user-1",
    type: "followup_done",
    raw_content:
      "Completed 2-week check-in follow-up with Emma. She confirmed full product team rollout (18 users active). NPS: 9/10. Already seeing value in relationship tracking for their enterprise sales motions. Agreed to quarterly business reviews. She also agreed to serve as a reference customer.",
    media_url: null,
    source_context: null,
    ai_generated: false,
    created_at: "2026-04-01T10:00:00Z",
  },
  {
    id: "interaction-5-4",
    contact_id: "contact-5",
    owner_id: "user-1",
    type: "text_note",
    raw_content:
      "Emma sent a LinkedIn message thanking our team for the seamless onboarding experience. She asked if we'd be interested in co-presenting at an upcoming product management conference in Beijing (July 2026). Said she'd be happy to do a case study. Replying yes to both — great PR opportunity.",
    media_url: null,
    source_context: null,
    ai_generated: false,
    created_at: "2026-04-12T09:00:00Z",
  },

  // ─── James Wei (contact-6) ───────────────────────────────
  {
    id: "interaction-6-1",
    contact_id: "contact-6",
    owner_id: "user-1",
    type: "meeting_note",
    raw_content:
      "1-hour meeting with James Wei at Web3 Summit Shanghai. He's the CTO and technical co-founder of BlockBridge. Very deep technically — PhD in distributed systems from Fudan. Interested in using our product to manage investor relationships and partnership contacts. The Web3 market is tough but he seemed genuinely interested. No clear next step agreed — said to follow up in January.",
    media_url: null,
    source_context: "Web3 Summit Shanghai 2025",
    ai_generated: false,
    created_at: "2025-11-28T16:00:00Z",
  },
  {
    id: "interaction-6-2",
    contact_id: "contact-6",
    owner_id: "user-1",
    type: "followup_skipped",
    raw_content:
      "Skipping January follow-up with James. BlockBridge is clearly going through a difficult period — they laid off 17 people in November and the Web3 market is down 60% from peak. Not the right time to push a sales conversation. Will revisit when market conditions improve or when they announce their institutional pivot gaining traction.",
    media_url: null,
    source_context: null,
    ai_generated: false,
    created_at: "2026-01-15T09:00:00Z",
  },

  // ─── Priya Nair (contact-7) ──────────────────────────────
  {
    id: "interaction-7-1",
    contact_id: "contact-7",
    owner_id: "user-1",
    type: "voice_memo",
    raw_content:
      "Priya left a voice message after SaaStr India. She was very direct — said TechBridge India is actively looking for channel partners as they expand to Singapore. She mentioned they already have 3 AEs on the ground in Singapore and need a SaaS partner with existing enterprise relationships there. She's ready to move fast. Scheduling a call for next week.",
    media_url: "https://storage.example.com/voice/interaction-7-1.m4a",
    source_context: "Post-SaaStr India Annual 2026",
    ai_generated: false,
    created_at: "2026-04-04T17:00:00Z",
  },
  {
    id: "interaction-7-2",
    contact_id: "contact-7",
    owner_id: "user-1",
    type: "meeting_note",
    raw_content:
      "1-hour video call with Priya. She is extremely organized — came with a structured agenda covering: (1) partnership model overview, (2) revenue share expectations, (3) technical integration requirements, (4) co-selling motion, (5) timeline. TechBridge India wants to close a partnership agreement by April 30. She asked for our standard agreement template and a list of Singapore customers. Very strong intent.",
    media_url: null,
    source_context: "Video call — Google Meet",
    ai_generated: false,
    created_at: "2026-04-10T10:00:00Z",
  },
  {
    id: "interaction-7-3",
    contact_id: "contact-7",
    owner_id: "user-1",
    type: "email_snippet",
    raw_content:
      "From: priya.nair@techbridge.in\nSubject: Re: Partnership Discussion Follow-up\n\nHi,\n\nThank you for the productive call today. As discussed, here are our 5 key integration requirements:\n1. REST API with OAuth 2.0 for CRM sync\n2. Salesforce connector (we use SF Enterprise)\n3. Slack notifications for deal updates\n4. Multi-language support (English + Hindi + Tamil)\n5. GDPR-compliant data residency option (EU or India)\n\nPlease share the standard partnership agreement template at your earliest convenience. We'd also love a list of your Singapore customers for reference checks.\n\nLooking forward to our April 17 call.\n\nBest,\nPriya",
    media_url: null,
    source_context: "Email — April 12 2026",
    ai_generated: false,
    created_at: "2026-04-12T14:30:00Z",
  },
];

// ─────────────────────────────────────────────────────────────
// CONTACTS
// ─────────────────────────────────────────────────────────────

export const mockContacts: Contact[] = [
  {
    id: "contact-1",
    owner_id: "user-1",
    name: "Lisa Chen",
    title: "VP of Engineering",
    company: "NovaTech",
    email: "lisa.chen@novatech.com",
    phone: "+86 755 8800 1234",
    linkedin_url: "https://linkedin.com/in/lisachen-novatech",
    location: "Shenzhen, China",
    stage: "negotiating",
    importance: "high",
    tags: ["High Intent", "Decision Maker", "Technical Buyer"],
    source: "voice",
    last_interaction_at: "2026-04-10T09:00:00Z",
    next_followup_at: "2026-04-18T09:00:00Z",
    followup_reason: "Send revised phased-pricing proposal before Friday deadline",
    company_industry: "AI/SaaS",
    company_size: "105,000 employees",
    company_stage: "Series B",
    company_hq: "Shenzhen, China",
    company_description:
      "NovaTech develops enterprise AI tooling for manufacturing supply chains. Flagship product NovaSuite integrates with SAP and Oracle systems.",
    deal_value: 120000,
    deal_currency: "USD",
    deal_probability: 75,
    expected_close_date: "2026-05-15T00:00:00Z",
    ai_summary:
      "Strong rapport, proposal stage, budget approved Q1. Competing with Dataiku — differentiate on faster onboarding and native Chinese-language support.",
    relationship_score: 82,
    key_topics: ["Cloud migration", "Data security", "AI tooling"],
    suggested_next_step: "Send revised phased-pricing proposal before Friday April 18",
    created_at: "2026-03-18T16:00:00Z",
    updated_at: "2026-04-10T09:00:00Z",
  },
  {
    id: "contact-2",
    owner_id: "user-1",
    name: "Marcus Johnson",
    title: "Head of Partnerships",
    company: "Synapse Labs",
    email: "marcus.j@synapselabs.io",
    phone: "+65 9101 2233",
    linkedin_url: "https://linkedin.com/in/marcusjohnsonsg",
    location: "Singapore",
    stage: "engaged",
    importance: "high",
    tags: ["Partnership Lead", "Fast Responder"],
    source: "card_ocr",
    last_interaction_at: "2026-03-28T10:00:00Z",
    next_followup_at: "2026-04-22T10:00:00Z",
    followup_reason: "Check in after Marcus presents partnership proposal to CEO",
    company_industry: "FinTech",
    company_size: "85 employees",
    company_stage: "Series A",
    company_hq: "Singapore",
    company_description:
      "Synapse Labs develops AI-powered compliance and regulatory reporting tools for mid-size banks and credit unions across Southeast Asia.",
    deal_value: 45000,
    deal_currency: "USD",
    deal_probability: 55,
    expected_close_date: "2026-04-30T00:00:00Z",
    ai_summary:
      "Partnership lead from Singapore FinTech Festival. Fast responder, analytical. CEO approval pending April 20 — reconvene April 22.",
    relationship_score: 68,
    key_topics: ["Channel partnerships", "FinTech compliance", "Revenue share"],
    suggested_next_step: "Prepare revenue share counter-proposal for April 22 call",
    created_at: "2026-03-05T10:15:00Z",
    updated_at: "2026-03-28T10:00:00Z",
  },
  {
    id: "contact-3",
    owner_id: "user-1",
    name: "Sarah Park",
    title: "Founder & CEO",
    company: "GrowthOS",
    email: "sarah@growthos.io",
    phone: null,
    linkedin_url: "https://linkedin.com/in/sarahpark-growthos",
    location: "Seoul, South Korea",
    stage: "contacted",
    importance: "medium",
    tags: ["Founder", "Early Stage"],
    source: "text",
    last_interaction_at: "2026-04-08T11:30:00Z",
    next_followup_at: "2026-04-22T09:00:00Z",
    followup_reason: "Re-engage after seed close dust settles; offer async demo recording",
    company_industry: "SaaS/PLG",
    company_size: "12 employees",
    company_stage: "Seed",
    company_hq: "Seoul, South Korea",
    company_description:
      "GrowthOS builds a revenue intelligence platform helping early-stage B2B SaaS companies understand trial-to-paid conversion through behavioral analytics and AI recommendations.",
    deal_value: null,
    deal_currency: "USD",
    deal_probability: 30,
    expected_close_date: null,
    ai_summary:
      "Warm intro via SparkLabs. Just closed $2.5M seed (March 2026). Interested but busy with fundraise aftermath. Reach out late April with async demo offer.",
    relationship_score: 45,
    key_topics: ["PLG", "Revenue intelligence", "Slack integration"],
    suggested_next_step: "Send async Loom demo and congrats on seed close after April 20",
    created_at: "2026-04-02T09:30:00Z",
    updated_at: "2026-04-08T11:30:00Z",
  },
  {
    id: "contact-4",
    owner_id: "user-1",
    name: "David Huang",
    title: "VP Sales",
    company: "CloudScale",
    email: "d.huang@cloudscale.hk",
    phone: "+852 9876 5432",
    linkedin_url: "https://linkedin.com/in/davidhuangcloudscale",
    location: "Hong Kong",
    stage: "new_lead",
    importance: "medium",
    tags: ["Enterprise", "New Lead"],
    source: "web_search",
    last_interaction_at: "2026-04-10T10:00:00Z",
    next_followup_at: "2026-04-17T09:00:00Z",
    followup_reason: "Send cold outreach email referencing Q1 2026 earnings call tooling commentary",
    company_industry: "Cloud Infrastructure",
    company_size: "3,400 employees",
    company_stage: "Public",
    company_hq: "Hong Kong",
    company_description:
      "CloudScale (HKEX: 9988) is a publicly listed cloud infrastructure company providing managed cloud, CDN, and enterprise connectivity services across Asia.",
    deal_value: 200000,
    deal_currency: "USD",
    deal_probability: 20,
    expected_close_date: "2026-09-30T00:00:00Z",
    ai_summary:
      "Imported from LinkedIn Sales Navigator. No prior contact. Q1 earnings flagged tooling investment as priority — strong cold outreach angle. Expect 90–180 day procurement cycle.",
    relationship_score: 15,
    key_topics: ["Enterprise cloud", "Procurement cycles", "ROI models"],
    suggested_next_step: "Send personalized cold email referencing CloudScale Q1 2026 earnings call",
    created_at: "2026-04-05T08:00:00Z",
    updated_at: "2026-04-10T10:00:00Z",
  },
  {
    id: "contact-5",
    owner_id: "user-1",
    name: "Emma Rodriguez",
    title: "Director of Product",
    company: "Nexus AI",
    email: "emma.r@nexus.ai",
    phone: null,
    linkedin_url: "https://linkedin.com/in/emmarodriguez-nexus",
    location: "Beijing, China",
    stage: "closed_won",
    importance: "medium",
    tags: ["Closed", "Reference Customer"],
    source: "manual",
    last_interaction_at: "2026-04-12T09:00:00Z",
    next_followup_at: "2026-04-25T10:00:00Z",
    followup_reason: "Follow up on sales team expansion interest and case study request",
    company_industry: "AI/ML",
    company_size: "620 employees",
    company_stage: "Series C",
    company_hq: "Beijing, China",
    company_description:
      "Nexus AI builds an end-to-end ML platform for enterprise clients across financial services, healthcare, and logistics.",
    deal_value: 80000,
    deal_currency: "USD",
    deal_probability: 100,
    expected_close_date: "2026-03-15T00:00:00Z",
    ai_summary:
      "Deal closed March 15 ($80K). Strong post-sale engagement. Sales team expansion opportunity ($20–30K uplift). Active reference customer — agreed to case study and conference co-presentation.",
    relationship_score: 91,
    key_topics: ["ML platform", "Product-led growth", "Enterprise expansion"],
    suggested_next_step: "Pursue sales team expansion and request written case study quote",
    created_at: "2026-01-10T09:00:00Z",
    updated_at: "2026-04-12T09:00:00Z",
  },
  {
    id: "contact-6",
    owner_id: "user-1",
    name: "James Wei",
    title: "CTO",
    company: "BlockBridge",
    email: "james@blockbridge.xyz",
    phone: null,
    linkedin_url: "https://linkedin.com/in/jamesweiblockbridge",
    location: "Shanghai, China",
    stage: "dormant",
    importance: "low",
    tags: ["Cold Lead"],
    source: "manual",
    last_interaction_at: "2025-12-01T09:00:00Z",
    next_followup_at: null,
    followup_reason: null,
    company_industry: "Web3/Blockchain",
    company_size: "45 employees",
    company_stage: "Series A",
    company_hq: "Shanghai, China",
    company_description:
      "BlockBridge builds cross-chain settlement infrastructure for institutional crypto traders and DeFi protocols.",
    deal_value: null,
    deal_currency: "USD",
    deal_probability: 10,
    expected_close_date: null,
    ai_summary:
      "Dormant since Dec 2025. Web3 market headwinds and BlockBridge's strategic pivot away from retail DeFi make timing difficult. Revisit if market recovers or institutional product gains traction.",
    relationship_score: 22,
    key_topics: ["Web3", "Blockchain infrastructure", "Institutional crypto"],
    suggested_next_step: "Monitor for re-engagement triggers; revisit Q3 2026 if conditions improve",
    created_at: "2025-09-15T10:00:00Z",
    updated_at: "2026-01-15T09:00:00Z",
  },
  {
    id: "contact-7",
    owner_id: "user-1",
    name: "Priya Nair",
    title: "Head of Sales",
    company: "TechBridge India",
    email: "priya.nair@techbridge.in",
    phone: "+91 98200 45678",
    linkedin_url: "https://linkedin.com/in/priyanair-techbridge",
    location: "Mumbai, India",
    stage: "engaged",
    importance: "high",
    tags: ["High Intent", "Channel Partner"],
    source: "voice",
    last_interaction_at: "2026-04-12T14:30:00Z",
    next_followup_at: "2026-04-17T09:00:00Z",
    followup_reason: "Partnership agreement review call scheduled — she expects our draft and Singapore customer list",
    company_industry: "Enterprise SaaS",
    company_size: "230 employees",
    company_stage: "Series B",
    company_hq: "Mumbai, India",
    company_description:
      "TechBridge India builds workflow automation and ERP integration tools for mid-market Indian enterprises. Deep partnerships with Tata Group and Mahindra.",
    deal_value: 60000,
    deal_currency: "USD",
    deal_probability: 60,
    expected_close_date: "2026-04-30T00:00:00Z",
    ai_summary:
      "High intent channel partner from SaaStr India. Call tomorrow (April 17) to review partnership agreement. Tata Digital partnership and Singapore expansion create strong strategic alignment.",
    relationship_score: 72,
    key_topics: ["Channel partnerships", "India enterprise SaaS", "APAC expansion"],
    suggested_next_step: "Prepare partnership agreement draft and Singapore customer reference list for April 17 call",
    created_at: "2026-04-02T18:00:00Z",
    updated_at: "2026-04-12T14:30:00Z",
  },
];

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Get all data for a single contact including joined sections and interactions.
 * Used for the contact detail page.
 */
export function getMockContact(
  id: string
): (Contact & { sections: Section[]; interactions: Interaction[] }) | undefined {
  const contact = mockContacts.find((c) => c.id === id);
  if (!contact) return undefined;
  return {
    ...contact,
    sections: mockSections.filter((s) => s.contact_id === id),
    interactions: mockInteractions.filter((i) => i.contact_id === id),
  };
}

/**
 * Get contacts whose follow-up is due today or overdue.
 * Used for the "Today's Suggestions" view.
 */
export function getMockFollowupSuggestions(): Contact[] {
  const today = new Date("2026-04-16");
  return mockContacts.filter((c) => {
    if (!c.next_followup_at) return false;
    return new Date(c.next_followup_at) <= today;
  });
}
