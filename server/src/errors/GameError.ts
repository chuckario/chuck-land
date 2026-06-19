export type GameErrorCode =
  | 'LOBBY_FULL'
  | 'LOBBY_NOT_FOUND'
  | 'ALREADY_CONNECTED'
  | 'INVALID_INPUT'
  | 'UNAUTHORIZED'
  | 'RATE_LIMITED'
  | 'SESSION_EXPIRED'
  | 'SESSION_INVALID'
  | 'HERO_NOT_FOUND'
  | 'ACTION_FAILED'
  | 'PERSISTENCE_ERROR';

export class GameError extends Error {
  readonly code: GameErrorCode;
  readonly clientMessage: string;
  readonly context?: Record<string, unknown>;

  constructor(
    code: GameErrorCode,
    clientMessage: string,
    context?: Record<string, unknown>,
  ) {
    super(clientMessage);
    this.name = 'GameError';
    this.code = code;
    this.clientMessage = clientMessage;
    this.context = context;
  }
}
