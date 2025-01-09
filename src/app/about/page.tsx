import TextPage from "@/src/components/layout/Textpage";

export const metadata = {
  	title: 'About Page',
};

export default function About() {
  return (
    <TextPage>
    	<div className="wrapper multiline">
    		<h1 className="title">About Page</h1>

    		<p className="textBody">
          	This is Gabriel's website. He likes to code and cook and make cool
          	things, or at least things that he thinks are cool. not much though...
    		</p>
      	</div>
    </TextPage>
  );
}
