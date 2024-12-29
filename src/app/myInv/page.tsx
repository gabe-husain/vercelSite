import TextPage from "@/src/components/layout/Textpage";

export default function MyInv() {
  return (
    <TextPage>
      <div className="wrapper multiline">
        <title>Welcome to Gabriel's Website</title>
        <h1 className="title">Welcome to Gabriel's Kitchen Inventory </h1>

        <p className="textBody">
          Time to write about my kitchen inventory. 
          This app will provide a realtime access to an SQL database built thru PostgreSQL hosted on Supabase.
          
        </p>
      </div>
    </TextPage>
  );
}
