import Link from "next/link";
import {
  fetchFarmersCornerData,
  gabSitePosts,
} from "@/src/lib/farmersCorner";
import { getPosts } from "@/src/lib/posts";

export default async function FarmersCorner() {
  const [data, recipes] = await Promise.all([
    fetchFarmersCornerData(),
    getPosts("recipes"),
  ]);

  const recentRecipes = recipes.slice(0, 2);

  return (
    <section className="farmers-corner">
      <h2 className="farmers-corner-heading">Farmer&apos;s Corner</h2>

      <div className="farmers-corner-meta">
        {data.daysUntilSeason && (
          <span>
            {data.daysUntilSeason.days} day{data.daysUntilSeason.days !== 1 ? "s" : ""}{" "}
            until {data.daysUntilSeason.season}
          </span>
        )}
        {data.moonPhase && (
          <>
            <span className="farmers-corner-dot"> · </span>
            <span>{data.moonPhase}</span>
          </>
        )}
      </div>

      {data.lead && (
        <div className="farmers-corner-section">
          <Link
            href={data.lead.url}
            target="_blank"
            rel="noopener noreferrer"
            className="farmers-corner-lead"
          >
            <span className="farmers-corner-lead-title">
              {data.lead.title}
            </span>
            <span className="farmers-corner-lead-excerpt">
              {data.lead.excerpt}
            </span>
          </Link>
          <p className="farmers-corner-credit">
            via{" "}
            <Link
              href="https://www.farmersalmanac.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Farmers&apos; Almanac
            </Link>
          </p>
        </div>
      )}

      {data.upcoming.length > 0 && (
        <div className="farmers-corner-section">
          <h3 className="farmers-corner-subhead">Coming up</h3>
          <ul className="farmers-corner-upcoming">
            {data.upcoming.map((u) => (
              <li key={u.url}>
                <Link
                  href={u.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="farmers-corner-upcoming-date">
                    {new Date(u.date + "T12:00:00").toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric" }
                    )}
                  </span>{" "}
                  {u.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {gabSitePosts.length > 0 && (
        <div className="farmers-corner-section">
          <h3 className="farmers-corner-subhead">From the notebook</h3>
          <ul className="farmers-corner-posts">
            {gabSitePosts.map((post) => (
              <li key={post.url}>
                <Link
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {post.title}
                </Link>
                <span className="farmers-corner-post-date">
                  {new Date(post.date + "T12:00:00").toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric", year: "numeric" }
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {recentRecipes.length > 0 && (
        <div className="farmers-corner-section">
          <h3 className="farmers-corner-subhead">Recent recipes</h3>
          <ul className="farmers-corner-posts">
            {recentRecipes.map((recipe) => (
              <li key={recipe.slug}>
                <Link href={`/blog/recipes/${recipe.slug}`}>
                  {recipe.title}
                </Link>
                <span className="farmers-corner-post-date">
                  {recipe.date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
