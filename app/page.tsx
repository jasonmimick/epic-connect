import { TEST_PATIENTS } from "@/lib/epic-config";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-8">
      <div className="max-w-lg w-full space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-xl font-bold">
              C
            </div>
            <h1 className="text-2xl font-bold tracking-tight">ChartKeep</h1>
          </div>
          <p className="text-gray-400 text-sm">
            Connect your Epic MyChart account to pull your complete health record.
          </p>
        </div>

        {/* Error banner */}
        {params.error && (
          <div className="bg-red-950 border border-red-800 rounded-xl p-4 text-sm text-red-300">
            Auth error: <span className="font-mono">{params.error}</span>
          </div>
        )}

        {/* Connect button */}
        <a
          href="/api/auth/launch"
          className="block w-full bg-blue-600 hover:bg-blue-500 text-white text-center py-3 px-6 rounded-xl font-semibold transition-colors"
        >
          Connect with Epic MyChart →
        </a>

        {/* Sandbox test credentials */}
        <div className="border border-gray-800 rounded-xl p-5 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Sandbox Test Patients
          </p>
          <p className="text-xs text-gray-500">
            Use any of these to log in when Epic redirects you:
          </p>
          <div className="space-y-2">
            {TEST_PATIENTS.map((p) => (
              <div key={p.username} className="flex items-center justify-between text-sm">
                <span className="text-gray-300">{p.name}</span>
                <span className="text-gray-500 font-mono">
                  {p.username} / {p.password}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Setup note */}
        <div className="text-xs text-gray-600 space-y-1">
          <p>
            Requires{" "}
            <code className="bg-gray-900 px-1 py-0.5 rounded">EPIC_CLIENT_ID</code> and{" "}
            <code className="bg-gray-900 px-1 py-0.5 rounded">EPIC_CLIENT_SECRET</code> in{" "}
            <code className="bg-gray-900 px-1 py-0.5 rounded">.env.local</code>.
          </p>
          <p>
            Register at{" "}
            <a
              href="https://fhir.epic.com/Developer/Index"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              fhir.epic.com
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
