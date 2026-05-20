"use client";

import { useState, useCallback } from "react";
import {
  GripVertical,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  ExternalLink,
  Zap,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { BioProfile } from "@/components/BioProfile";
import { SocialLink, SocialPlatform } from "@/lib/types";

const PLATFORMS: SocialPlatform[] = [
  "twitter",
  "instagram",
  "github",
  "youtube",
  "twitch",
  "discord",
  "spotify",
  "tiktok",
  "custom",
];

function newLink(): SocialLink {
  return {
    id: `sl_${Date.now()}`,
    platform: "custom",
    label: "My Link",
    url: "https://",
    visible: true,
    order: 0,
  };
}

export default function DashboardPage() {
  const { user, updateUser } = useAuth();
  const [tab, setTab] = useState<"links" | "premium">("links");

  const links = user?.socialLinks ?? [];

  const setLinks = useCallback(
    (updated: SocialLink[]) => {
      updateUser({ socialLinks: updated.map((l, i) => ({ ...l, order: i })) });
    },
    [updateUser]
  );

  const addLink = () => setLinks([...links, newLink()]);

  const removeLink = (id: string) =>
    setLinks(links.filter((l) => l.id !== id));

  const toggleLink = (id: string) =>
    setLinks(links.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)));

  const updateLink = (id: string, field: keyof SocialLink, value: string) =>
    setLinks(
      links.map((l) => (l.id === id ? { ...l, [field]: value } : l))
    );

  if (!user) return null;

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Editor */}
      <div className="flex flex-1 flex-col overflow-y-auto border-r border-white/10 p-6">
        <div className="mb-6 flex items-center gap-4">
          <h1 className="text-lg font-bold text-white">Edit Profile</h1>
          <div className="flex gap-2">
            {(["links", "premium"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-md px-3 py-1 text-xs capitalize transition ${
                  tab === t
                    ? "bg-white/10 text-white"
                    : "text-white/30 hover:text-white/60"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {tab === "links" && (
          <section className="space-y-4">
            {/* Bio */}
            <div>
              <label className="mb-1 block text-xs text-white/40">Bio</label>
              <textarea
                value={user.bio ?? ""}
                onChange={(e) => updateUser({ bio: e.target.value })}
                rows={2}
                className="w-full resize-none rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 outline-none focus:border-white/30"
              />
            </div>

            {/* Display name */}
            <div>
              <label className="mb-1 block text-xs text-white/40">
                Display Name
              </label>
              <input
                value={user.displayName}
                onChange={(e) => updateUser({ displayName: e.target.value })}
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 outline-none focus:border-white/30"
              />
            </div>

            {/* Social links */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs text-white/40">Social Links</label>
                <button
                  onClick={addLink}
                  className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition"
                >
                  <Plus size={12} /> Add
                </button>
              </div>
              <div className="space-y-2">
                {links.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2"
                  >
                    <GripVertical
                      size={14}
                      className="shrink-0 cursor-grab text-white/20"
                    />
                    <select
                      value={link.platform}
                      onChange={(e) =>
                        updateLink(link.id, "platform", e.target.value)
                      }
                      className="rounded border border-white/10 bg-black px-1.5 py-1 text-xs text-white/60 outline-none"
                    >
                      {PLATFORMS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    <input
                      value={link.label}
                      onChange={(e) =>
                        updateLink(link.id, "label", e.target.value)
                      }
                      placeholder="Label"
                      className="w-20 rounded border border-white/10 bg-black px-2 py-1 text-xs text-white/60 outline-none focus:border-white/30"
                    />
                    <input
                      value={link.url}
                      onChange={(e) =>
                        updateLink(link.id, "url", e.target.value)
                      }
                      placeholder="https://"
                      className="min-w-0 flex-1 rounded border border-white/10 bg-black px-2 py-1 text-xs text-white/60 outline-none focus:border-white/30"
                    />
                    <button
                      onClick={() => toggleLink(link.id)}
                      className="text-white/30 hover:text-white/70 transition"
                    >
                      {link.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                    </button>
                    <button
                      onClick={() => removeLink(link.id)}
                      className="text-white/30 hover:text-red-400 transition"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                {links.length === 0 && (
                  <p className="text-xs text-white/20">No links yet. Add one above.</p>
                )}
              </div>
            </div>
          </section>
        )}

        {tab === "premium" && (
          <section className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center">
              <Zap size={28} className="mx-auto mb-3 text-white/60" />
              <h2 className="text-base font-semibold text-white">
                Go Premium
              </h2>
              <p className="mt-1 text-xs text-white/40">
                Unlock animated backgrounds, custom subdomains, TTS in chat, and exclusive badges.
              </p>
              <div className="mt-5 flex flex-col gap-2">
                <CheckoutButton plan="monthly" label="$4 / month" />
                <CheckoutButton plan="annual" label="$35 / year (save 27%)" />
              </div>
            </div>

            {user.tier !== "free" && (
              <div>
                <label className="mb-1 block text-xs text-white/40">
                  Custom Subdomain (Premium)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    value={user.profileTheme.customSubdomain ?? ""}
                    onChange={(e) =>
                      updateUser({
                        profileTheme: {
                          ...user.profileTheme,
                          customSubdomain: e.target.value,
                        },
                      })
                    }
                    placeholder="yourname"
                    className="flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 outline-none focus:border-white/30"
                  />
                  <span className="text-xs text-white/30">.arrowchat.app</span>
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      {/* Preview */}
      <div className="hidden w-80 shrink-0 flex-col items-center overflow-y-auto border-l border-white/10 bg-black/30 p-6 xl:flex">
        <div className="mb-4 flex items-center gap-2 self-start">
          <ExternalLink size={13} className="text-white/30" />
          <span className="text-xs text-white/30">Live Preview</span>
        </div>
        <div className="w-full max-w-[260px]">
          <BioProfile user={user} />
        </div>
      </div>
    </div>
  );
}

function CheckoutButton({
  plan,
  label,
}: {
  plan: "monthly" | "annual";
  label: string;
}) {
  const handleCheckout = async () => {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const data = (await res.json()) as { url?: string; error?: string };
    if (data.url) window.location.href = data.url;
  };

  return (
    <button
      onClick={handleCheckout}
      className="w-full rounded-md border border-white/20 bg-white/5 px-4 py-2.5 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
    >
      {label}
    </button>
  );
}
