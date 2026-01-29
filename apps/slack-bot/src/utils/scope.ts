export function isInScopeChannel(channelId: string): boolean {
  const scoped = process.env.E2E_CHANNEL_ID;
  if (!scoped) return true; // allow all if not set
  return channelId === scoped;
}
