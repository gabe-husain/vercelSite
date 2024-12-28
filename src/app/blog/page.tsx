import TextPage from "@/src/components/layout/Textpage";
import RecentPosts from "@/src/components/automation/RecentPosts";

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
        <h2 className="subtitle">
          Recent Posts
        </h2>

        <RecentPosts />

      </div>
    </TextPage>
  );
}
