import TextPage from "@/src/components/layout/Textpage";
import { Deck } from "@/src/components/cards/Deck";
import { currentCardData, deprecatedCardData, phishingCardData } from "@/src/app/projects/cardData";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
  } from "@/components/ui/accordion"
 import "@/src/app/projects/projects.css";

export const metadata = {
  	title: 'Projects Page',
};

export default function Projects() {
  return (
    <TextPage>
    	<div className="wrapper multiline">
			<h1 className="title">Gabriel's Projects</h1>
			<p className="textBody">
				Here is a list of past projects built by Gabriel Husain: <br />
				For any of the python ones email Gabriel so he can give you access.
			</p>

			<Accordion
				type="multiple"
				defaultValue={['item-0']}
				className="accordion"
				>

				<AccordionItem value="item-0">
					<AccordionTrigger className="accordionTitle">Current Working Projects</AccordionTrigger>
					<AccordionContent className="accordionContent">
						<h3 className="accordionSubtitle">Currently Running</h3>
						<Deck cards={currentCardData} />
					</AccordionContent>
				</AccordionItem>
				<AccordionItem value="item-1">
					<AccordionTrigger className="accordionTitle">Deprecated Projects</AccordionTrigger>
					<AccordionContent className="accordionContent">
						<h3 className="accordionSubtitle">Useless because of api troubles/ deprecation of endpoints</h3>
						<Deck cards={deprecatedCardData} />
					</AccordionContent>
				</AccordionItem>
				<AccordionItem value="item-2">
					<AccordionTrigger className="accordionTitle">Phishing Sites</AccordionTrigger>
					<AccordionContent className="accordionContent">
						<h3 className="accordionSubtitle">Please don't put your actual information in these</h3>
						<p className="textBody">
							These sites are what got me into programming well this and a couple other things, they were fun ways to keep my friends on their toes back in middle school. <br />
							The login pages dont actually send the information to anyone and instead just post them to the url <br />
							We all gotta start somewhere... <br />
							What I learned from these projects is that I and my friends should always check the url before logging in to any site. <br />
							And that its SOOO easy to make a phishing site, especially as a 14 year old <br />
						</p>
						<Deck cards={phishingCardData} />
					</AccordionContent>
				</AccordionItem>
			</Accordion>
      	</div>
    </TextPage>
  );
}
