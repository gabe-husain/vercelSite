import TextPage from "@/src/components/layout/Textpage";
import AddItemForm from "@/src/components/myInv/inserting/addItemForm";
import InventoryList from "@/src/components/myInv/InventoryList";

export default function MyInv() {
  return (
    <TextPage>
      <div className="wrapper multiline">
        <title>Welcome to Gabriel's Website</title>
        <h1 className="title">All items in Gabriel's Kitchen </h1>

        <InventoryList />
        <AddItemForm />
      </div>
      
      

    </TextPage>
  );
}
