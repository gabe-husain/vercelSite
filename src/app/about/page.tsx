import TextPage from "@/src/components/layout/Textpage";
import { Deck } from "@/src/components/cards/Deck";

export const metadata = {
  	title: 'About Page',
};

const cardData = [
    {
        title: "Colab Shuffle",
        subtitle: "Deprecated, Spotify no longer supports audio features",
		content: "An app that allows users to create collaborative playlists that clusters the songs and rearranges them based off their audio features.",
        link: "https://estgab413.pythonanywhere.com/"
    },
    {
        title: "MoBHit",
        subtitle: "Created for the Banfield Lab",
        content: "MoBHit - Molybdenum-Based HMM Scanner 🧬 <br>Upload FASTA files or paste sequences directly<br>Scan against curated HMM profiles of MoCo enzyme families",
		link: "https://gabh.pythonanywhere.com/"
    },
	{
		title: "Spotify Now Playing Viewer and Playlist Generator",
		subtitle: "The latter is deprecated again, but the first works! and it looks pretty cool",
		content: "It works using a marquee thing and figures out what color cluster is the most in the album and the makes the background that color. You scroll to either have marquee only or album cover too",
		link: "https://gawesome13.pythonanywhere.com/"
	},
	{
		title: "My Inventory",
		subtitle: "the main reason for this site",
		content: "Gabriel's inventory of his stuff. It's a work in progress, but it's pretty cool, and you know exactly whats in his pantry",
		link: "/myInv"
	}
];

export default function About() {
  return (
    <TextPage>
    	<div className="wrapper multiline">
    		<h1 className="title">About Page</h1>

    		<p className="textBody">
          	This is Gabriel's website. He likes to code and cook and make cool
          	things, or at least things that he thinks are cool. not much though...
    		</p>

			<p className="textBody">
				Here is a list of past projects built by Gabriel Husain: <br />
				For any of the python ones email Gabriel so he can give you access.
			</p>
			<Deck cards={cardData} />
      	</div>
    </TextPage>
  );
}
