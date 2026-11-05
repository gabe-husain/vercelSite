export type Promoted = {
  id: string;
  title: string;
  blurb: string;
  href: string;
  weight: 1 | 2 | 3;
};

export const promotedItems: Promoted[] = [
  {
    id: "card:my-inventory",
    title: "My Inventory",
    blurb: "See exactly what's in Gabriel's pantry — a living inventory of his kitchen and stuff.",
    href: "/myInv",
    weight: 3,
  },
  {
    id: "card:gabbsite",
    title: "Gabbsite",
    blurb: "Gabriel's external brain — thoughts, notes, and knowledge, unfiltered.",
    href: "https://gab-site.vercel.app/",
    weight: 3,
  },
  {
    id: "card:vowel-lab",
    title: "Vowel Lab",
    blurb: "Drag vowels around a chart, watch formants in a live spectrum, and hear the difference.",
    href: "/vowel-lab/index.html",
    weight: 2,
  },
  {
    id: "page:/myInv/kitchen",
    title: "Kitchen Map",
    blurb: "An interactive map of Gabriel's kitchen — every zone, every shelf.",
    href: "/myInv/kitchen",
    weight: 3,
  },
];
