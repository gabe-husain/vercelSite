export default function RecipeLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
      <div className="recipe-layout">
        {children}
      </div>
    );
  }