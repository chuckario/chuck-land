import { Socket } from 'socket.io';
import { SOCKET_EVENTS } from '../../../shared/types';
import { Logger } from '../logging/Logger';
import { GameError } from './GameError';

export class ErrorHandler {
  constructor(private readonly logger: Logger) {}

  emitToSocket(socket: Socket, error: GameError | Error, socketId?: string): void {
    const gameError = error instanceof GameError
      ? error
      : new GameError('ACTION_FAILED', 'Ein unerwarteter Fehler ist aufgetreten.');

    this.logger.warn('Client-Fehler', {
      socketId: socketId ?? socket.id,
      code: gameError.code,
      message: gameError.message,
      ...gameError.context,
    });

    if (gameError.code === 'LOBBY_FULL') {
      socket.emit(SOCKET_EVENTS.SERVER_FULL, {
        message: gameError.clientMessage,
      });
      return;
    }

    if (gameError.code === 'RATE_LIMITED') {
      socket.emit(SOCKET_EVENTS.RATE_LIMITED, {
        message: gameError.clientMessage,
      });
      return;
    }

    socket.emit(SOCKET_EVENTS.ERROR, {
      message: gameError.clientMessage,
      code: gameError.code,
    });
  }

  handleUnexpected(scope: string, error: unknown, context?: Record<string, unknown>): void {
    this.logger.error(`Unerwarteter Fehler in ${scope}`, context, error);
  }
}
