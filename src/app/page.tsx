import TextPage from "../components/layout/Textpage";

import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Home'
};

export default function Home() {
  return (
    <TextPage>
      <div className="wrapper multiline">
        <h1 className="title">Welcome to Gabriel's Website </h1>

        <p className="textBody">
          There's not much here. Not even a couple pages.
        </p>
      </div>
    </TextPage>
  );
}
