/**
 * Parses your E2E failure message format.
 * Example:
 * :red_circle:  FAILURE
 * E2E tests are failing on the live environment for the playback-v2 app.
 * ... 
 * The ScheduledTasks stage in iplayer-web-app-playback-v2-e2e-live-pipeline has FAILED
 * Link to pipeline
 */

export type ParsedIncident = {
  env?: string;
  app?: string;
  failingTests: string[];
  pipelineName?: string;
  stageName?: string;
  pipelineLink?: string;
  raw: string;
};

const URL_RE = /(https?:\/\/[^\s>]+)|(www\.[^\s>]+)/gi;

export function parseFailureMessage(text: string): ParsedIncident | null {
  const lower = text.toLowerCase();

  // Heuristics: must look like an E2E failure message
  const isFailure =
    lower.includes('e2e') &&
    (lower.includes('failing') || lower.includes('has failed') || lower.includes('failure'));

  if (!isFailure) return null;

  // env + app: "... failing on the live environment for the playback-v2 app."
  const envMatch = text.match(/failing\s+on\s+the\s+([a-zA-Z0-9_-]+)\s+environment/i);
  const appMatch = text.match(/for\s+the\s+([a-zA-Z0-9_-]+)\s+app\.?/i);

  // pipeline + stage: "The ScheduledTasks stage in <pipeline> has FAILED"
  const stagePipelineMatch = text.match(
    /The\s+(.+?)\s+stage\s+in\s+(.+?)\s+has\s+FAILED/i,
  );

  const failingTests: string[] = [];

  // Find "Failing Tests" section and capture subsequent lines that look like test names
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const idx = lines.findIndex((l) => l.toLowerCase().includes('failing tests'));
  if (idx >= 0) {
    for (let i = idx + 1; i < Math.min(lines.length, idx + 8); i++) {
      const l = lines[i];
      if (l.toLowerCase().includes('stage in') || l.toLowerCase().includes('link to')) break;
      if (l.startsWith(':')) continue;
      if (l.length >= 4) failingTests.push(l);
    }
  }

  // Any URL in the message counts as pipeline link (first one)
  const urlMatch = text.match(URL_RE);
  const pipelineLink = urlMatch ? urlMatch[0] : undefined;

  return {
    env: envMatch?.[1],
    app: appMatch?.[1],
    failingTests,
    pipelineName: stagePipelineMatch?.[2]?.trim(),
    stageName: stagePipelineMatch?.[1]?.trim(),
    pipelineLink,
    raw: text,
  };
}
