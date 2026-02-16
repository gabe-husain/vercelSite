import { login, signup } from './actions'
import TextPage from "@/src/components/layout/Textpage";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  const params = await searchParams;

  return (
    <TextPage>
      <div className="wrapper multiline">
        <h1 className="title">Sign In</h1>
        <p className="textBody" style={{ marginBottom: '1.5rem' }}>
          Sign in to access the kitchen inventory.
        </p>

        {params.error && (
          <div className="rounded-md p-3 mb-4 border border-[hsl(var(--destructive))] text-[hsl(var(--destructive))]">
            {params.error}
          </div>
        )}

        {params.message && (
          <div className="rounded-md p-3 mb-4 border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]">
            {params.message}
          </div>
        )}

        <form className="space-y-4 max-w-sm mx-auto">
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-[hsl(var(--foreground))]">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-[hsl(var(--foreground))]">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
            />
          </div>

          <div className="flex gap-3">
            <button
              formAction={login}
              className="flex-1 rounded-md bg-[hsl(var(--primary))] px-4 py-2 text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity"
            >
              Log in
            </button>
            <button
              formAction={signup}
              className="flex-1 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2 text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
            >
              Sign up
            </button>
          </div>
        </form>
      </div>
    </TextPage>
  )
}
