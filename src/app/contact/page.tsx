import TextPage from "@/src/components/layout/Textpage";

export const metadata = {
  title: 'Contact Page',
};

export default function Contact() {
  return (
    <TextPage>
      <div className="wrapper multiline">

        <h1 className="title">Contact Page</h1>

        <p className="textBody">
          You can reach me at gabe [dot] husain [at] gmail [dot] com
        </p>
      </div>
    </TextPage>
  );
}
