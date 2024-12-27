import { ReactNode, PropsWithChildren } from "react";
import "@/src/styles/TextPage.css"

export default function TextPage({ children }: PropsWithChildren) {

    // I'm thinking this will just be a normal page. 
    // so it acts as it's own special little layout 
    // where any of my textpages might need specific 
    // layouts... probably centered with a chill margin

    return (<div className="TextPage">
        {children}
    </div>)
}