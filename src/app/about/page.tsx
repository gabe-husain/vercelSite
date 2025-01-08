import TextPage from "@/src/components/layout/Textpage";
import { Deck } from "@/src/components/cards/Deck";

export const metadata = {
  	title: 'About Page',
};

const deprecatedCardData = [
    {
        title: "FLASK - Colab Shuffle",
        subtitle: "Deprecated, Spotify no longer supports audio features",
		content: "An app that allows users to create collaborative playlists that clusters the songs and rearranges them based off their audio features.",
        link: "https://estgab413.pythonanywhere.com/"
    },
];

const currentCardData = [
    {
        title: "MoBHit",
        subtitle: "FLASK - Created for the Banfield Lab",
        content: "MoBHit - Molybdenum-Based HMM Scanner 🧬 <br>Upload FASTA files or paste sequences directly<br>Scan against curated HMM profiles of MoCo enzyme families",
		link: "https://gabh.pythonanywhere.com/"
    },
	{
		title: "Spotify Now Playing Viewer and Playlist Generator",
		subtitle: "FLASK - The latter is deprecated again, but the first works! and it looks pretty cool",
		content: "It works using a marquee thing and figures out what color cluster is the most in the album and the makes the background that color. You scroll to either have marquee only or album cover too",
		link: "https://gawesome13.pythonanywhere.com/"
	},
	{
		title: "My Inventory",
		subtitle: "NEXT.JS - the main reason for this site",
		content: "Gabriel's inventory of his stuff. It's a work in progress, but it's pretty cool, and you know exactly whats in his pantry",
		link: "/myInv"
	}
];
const phishingCardData = [
    {
        title: "PURE HTML/CSS - LFNY fpa login",
        subtitle: "A feigned login page for my high school wifi filter",
		content: "Why would I need to bypass or hide my traffic if the school wifi thinks I'm someone else browsing the internet? also there is a rickroll site that it used to redirect you to...",
        link: "https://gawesome13.github.io/lfny1/lfny,fpa.html"
    },
    {
        title: "PURE HTML/CSS/JS - Instagram Login",
        subtitle: "THIS IS A PHISHING SITE, it quite literally sends your login to me",
        content: "Also made around the same time... I think its funny to ask people to check out and friend me only to then tell them that they just gave me their login info. Internet safety is important always check the url",
		link: "https://gawesome13.github.io/insta/instagram.html"
    },
	{
		title: "Facebook Login",
		subtitle: "PURE HTML - broken basically",
		content: "This was always the hardest one to do. Facebook updates their outer HTML and css so I would have to recopy and reset it up each time... kinda ridiculous",
		link: "https://gawesome13.github.io/insta/facebook.html"
	}
];

const d3ModelCardData = [
	{
		title: "Thingiverse - designs I'm proud of",
		subtitle: "THINGIVERSE - main account",
		content: "When I was a wee lad and 3d printing had just started taking off, this is what I would be into and where I would post the designs as you did.",
		link: "https://www.thingiverse.com/gawesome13/designs"
	},
	{
		title: "Tinkercad - LFNY account",
		subtitle: "TINKERCAD - Humble beginnings as a middle schooler",
		content: "Here are some designs I made in middle school. I made tools that I needed around the house and in life",
		link: "https://www.tinkercad.com/users/jex9dpnfU9d"
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
			<Deck cards={currentCardData} />

			<h2 className="title">Deprecated Projects</h2>
			<Deck cards={deprecatedCardData} />

			<h2 className="title">Phishing Projects</h2>
			<p className="textBody">
				These sites are what got me into programming well this and a couple other things, they were fun ways to keep my friends on their toes back in middle school. <br />
				The login pages dont actually send the information to anyone and instead just post them to the url <br />
				We all gotta start somewhere... <br />
				What I learned from these projects is that I and my friends should always check the url before logging in to any site. <br />
				And that its SOOO easy to make a phishing site, especially as a 14 year old <br />
			</p>
			<p className="textBody">
				please don't use these sites to phish people, it's not cool and it's illegal and also don't put in your own login
			</p>
			<Deck cards={phishingCardData} />

			<h2 className="title">3D Modeling</h2>
			<p className="textBody">
				Here is some 3d modeling I've done throughout the years
			</p>
			<Deck cards={d3ModelCardData} />

      	</div>
    </TextPage>
  );
}
