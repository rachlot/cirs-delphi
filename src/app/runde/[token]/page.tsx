import { getRoundByToken } from "@/lib/round-data";
import { RoundClient } from "@/components/RoundClient";

export default async function RoundPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const round = await getRoundByToken(token);

  if (!round) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <p className="mx-auto max-w-md rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          Dieser Einladungslink ist ungültig oder wurde deaktiviert. Bitte prüfe den Link oder wende dich an
          die Organisation.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <RoundClient round={round} />
    </main>
  );
}
