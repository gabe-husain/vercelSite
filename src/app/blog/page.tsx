import TextPage from "@/src/components/layout/Textpage";
import RecentPosts from "@/src/components/automation/RecentPosts";
import "@/src/styles/Blog.css";

export default function Blog() {
  return (
    <TextPage>
      <div className="wrapper multiline">
        <title>Blog Page</title>

        <h1 className="title">Blog Page</h1>

        <p className="textBody">
          Here is where i write the shit thats on my mind. treasure trove of
          things and shit I guess.
        </p>
        

        <div className="recent-posts-container">
          <RecentPosts type="posts">
            <h2 className="subtitle">Recent Posts</h2>
          </RecentPosts>
          <RecentPosts type="recipes">
            <h2 className="subtitle">Recent Recipes</h2>
          </RecentPosts>
        </div>

      </div>
    </TextPage>
  );
}
