import { REVENUE_FORMULAS } from "@/lib/viral_knowledge";

export interface RevenueEstimate {
  estimated_monthly_views: number;
  bio_link_clicks: number;
  comment_dm_clicks: number;
  story_link_clicks: number;
  total_link_clicks: number;
  estimated_revenue: number;
  revenue_range: { low: number; high: number };
  breakdown: string;
}

export interface CompetitorInput {
  handle: string;
  follower_count: number;
  product_price: number;
}

export function estimate_competitor_revenue(
  follower_count: number,
  product_price: number,
  _platform: string = "instagram",
  stories_per_month: number = REVENUE_FORMULAS.stories_per_month_default,
  has_dm_automation: boolean = true
): RevenueEstimate {
  const f = REVENUE_FORMULAS;

  const estimated_monthly_views = follower_count * f.followers_to_views_multiplier;
  const bio_link_clicks = estimated_monthly_views * f.views_to_bio_clicks;
  const comment_dm_clicks = has_dm_automation
    ? estimated_monthly_views * f.views_to_comments * f.comments_to_dm_clicks
    : 0;
  const story_link_clicks =
    follower_count * f.story_view_rate * f.story_click_rate * stories_per_month;
  const total_link_clicks = bio_link_clicks + comment_dm_clicks + story_link_clicks;
  const estimated_revenue = total_link_clicks * f.purchase_conversion_rate * product_price;
  const revenue_range = {
    low: estimated_revenue * 0.5,
    high: estimated_revenue * 1.5,
  };

  const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  const money = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  const breakdown = [
    `Views: ${fmt(follower_count)} followers × ${f.followers_to_views_multiplier} = ${fmt(estimated_monthly_views)}/mo`,
    `Bio clicks: ${fmt(estimated_monthly_views)} views × ${f.views_to_bio_clicks} = ${fmt(bio_link_clicks)}`,
    has_dm_automation
      ? `DM clicks: ${fmt(estimated_monthly_views)} views × ${f.views_to_comments} comment rate × ${f.comments_to_dm_clicks} click rate = ${fmt(comment_dm_clicks)}`
      : `DM clicks: 0 (no DM automation)`,
    `Story clicks: ${fmt(follower_count)} followers × ${f.story_view_rate} story rate × ${f.story_click_rate} click rate × ${stories_per_month} stories = ${fmt(story_link_clicks)}`,
    `Total clicks: ${fmt(total_link_clicks)}`,
    `Revenue: ${fmt(total_link_clicks)} clicks × ${f.purchase_conversion_rate} conversion × ${money(product_price)} = ${money(estimated_revenue)}/mo`,
    `Range: ${money(revenue_range.low)} – ${money(revenue_range.high)}/mo`,
  ].join("\n");

  return {
    estimated_monthly_views,
    bio_link_clicks,
    comment_dm_clicks,
    story_link_clicks,
    total_link_clicks,
    estimated_revenue,
    revenue_range,
    breakdown,
  };
}

export function rank_competitors(
  competitors: CompetitorInput[]
): Array<CompetitorInput & { revenue_estimate: RevenueEstimate }> {
  return competitors
    .map((c) => ({
      ...c,
      revenue_estimate: estimate_competitor_revenue(c.follower_count, c.product_price),
    }))
    .sort((a, b) => b.revenue_estimate.estimated_revenue - a.revenue_estimate.estimated_revenue);
}
