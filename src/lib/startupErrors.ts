export type StartupIssue = {
  scope: string;
  detail: string;
};

const issues: StartupIssue[] = [];

const describe = (error: unknown) => {
  if (error instanceof Error) return `${error.message}${error.stack ? `\n${error.stack}` : ''}`;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

/**
 * Guards errors thrown while modules are evaluated, before React can mount an
 * error boundary. The root layout reads these and shows a readable screen.
 */
export function reportStartupIssue(scope: string, error: unknown) {
  issues.push({ scope, detail: describe(error) });
  console.warn(`[KESUUBIT:${scope}]`, error);
}

export function getStartupIssues(): StartupIssue[] {
  return [...issues];
}
