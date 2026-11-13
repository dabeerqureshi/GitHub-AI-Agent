export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-4">
          GitHub AI Workspace
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          Local-first, hybrid AI-powered GitHub management and coding agent.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
            <h2 className="text-lg font-bold mb-2">Local-First & Hybrid</h2>
            <p className="text-sm text-muted-foreground">
              Powered by local Ollama with seamless optional cloud provider routing (OpenAI & Anthropic).
            </p>
          </div>
          <div className="p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
            <h2 className="text-lg font-bold mb-2">Official GitHub MCP</h2>
            <p className="text-sm text-muted-foreground">
              Strictly integrated with the official GitHub Model Context Protocol server.
            </p>
          </div>
          <div className="p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
            <h2 className="text-lg font-bold mb-2">Human-In-The-Loop</h2>
            <p className="text-sm text-muted-foreground">
              Cryptographically verified approval gates for all mutating Git and GitHub actions.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
