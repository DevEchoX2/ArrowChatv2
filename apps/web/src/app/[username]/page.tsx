import { notFound } from "next/navigation";
import { MOCK_USERS } from "@/lib/mockData";
import { BioProfile } from "@/components/BioProfile";

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { username } = await params;
  const user = MOCK_USERS.find((u) => u.username === username);
  if (!user) return { title: "User not found" };
  return {
    title: `${user.displayName} (@${user.username}) · ArrowChat`,
    description: user.bio ?? "",
  };
}

export default async function UserProfilePage({ params }: Props) {
  const { username } = await params;
  const user = MOCK_USERS.find((u) => u.username === username);
  if (!user) notFound();

  return (
    <div className="flex flex-1 items-start justify-center overflow-y-auto px-4 py-12">
      <div className="w-full max-w-sm">
        <BioProfile user={user} />
      </div>
    </div>
  );
}
