export type VerifiedRiscEventEntry = {
  subjectSub?: string;
  reason?: string;
};

export type VerifiedRiscEvent = {
  jti: string;
  iat: number;
  issuer: string;
  audience: string;
  events: Record<string, VerifiedRiscEventEntry>;
};

export type RiscHandleOutcome =
  | { status: 'duplicate'; jti: string }
  | { status: 'noop'; jti: string }
  | {
      status: 'orphan';
      jti: string;
      providerSubject?: string;
      matchedEventTypes: string[];
    }
  | {
      status: 'revoked';
      jti: string;
      providerSubject: string;
      userId: string;
      revokedCount: number;
      matchedEventTypes: string[];
    };