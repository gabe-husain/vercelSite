import * as React from "react"
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import "@/src/styles/Deck.css"
import CardAnimation from "./CardAnimation"
import TrailCard from "./TrailCard"

export interface CardInformationProps {
    id: string;
    title: string;
    subtitle: string;
    content: string;
    link?: string;
}

interface DeckInfoProps {
    cards: ReadonlyArray<CardInformationProps>;
}

export function Deck({ cards }: DeckInfoProps) {
    return (
        <div className="deck-container">
            <div className="deck-grid">
                {cards.map((card, index) => (
                    <CardAnimation key={card.id} index={index}>
                        <TrailCard cardId={card.id}>
                            <Card className="deck-card">
                                <Link
                                    href={card.link || '#'}
                                >
                                    <CardHeader className="deck-card-header">
                                        <CardTitle className="deck-card-title">
                                            {card.title}
                                        </CardTitle>
                                        <CardDescription className="deck-card-subtitle">
                                            {card.subtitle}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="deck-card-content">
                                        <div
                                            className="multiline"
                                            dangerouslySetInnerHTML={{ __html: card.content }}
                                        />
                                    </CardContent>
                                    <CardFooter className="deck-card-footer">
                                        <span className="deck-link">Visit</span>
                                    </CardFooter>
                                </Link>
                            </Card>
                        </TrailCard>
                    </CardAnimation>
                ))}
            </div>
        </div>
    )
}