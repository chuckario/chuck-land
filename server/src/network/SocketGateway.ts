import { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS } from '../../../shared/types';
import { LobbyManager } from '../core/LobbyManager';
import { GameRoom } from '../core/GameRoom';
import { ErrorHandler } from '../errors/ErrorHandler';
import { GameError } from '../errors/GameError';
import { Logger } from '../logging/Logger';
import { ConnectionManager } from './ConnectionManager';
import { InputValidator } from '../security/InputValidator';
import { RateLimiter } from '../security/RateLimiter';
import { SessionManager } from '../security/SessionManager';
import { SyncBroadcaster } from '../sync/SyncBroadcaster';
import { serverConfig } from '../config/serverConfig';

export class SocketGateway {
  private readonly socketToLobby = new Map<string, string>();
  private readonly rateLimiter: RateLimiter;
  private readonly inputValidator = new InputValidator();
  private readonly syncByLobby = new Map<string, SyncBroadcaster>();

  constructor(
    private readonly io: Server,
    private readonly lobbyManager: LobbyManager,
    private readonly sessionManager: SessionManager,
    private readonly connectionManager: ConnectionManager,
    private readonly errorHandler: ErrorHandler,
    private readonly logger: Logger,
  ) {
    this.rateLimiter = new RateLimiter(serverConfig.rateLimitPerSecond);
  }

  register(): void {
    this.io.on('connection', (socket) => this.handleConnection(socket));
    this.logger.info('Socket-Gateway registriert');
  }

  broadcastAllLobbies(): void {
    for (const lobby of this.lobbyManager.getAllLobbies()) {
      this.broadcastLobby(lobby);
    }
  }

  broadcastLobby(lobby: GameRoom): void {
    const sync = this.getSyncBroadcaster(lobby);
    sync.broadcast(lobby.buildWorldState());
  }

  private handleConnection(socket: Socket): void {
    this.logger.debug('Neue Verbindung', { socketId: socket.id });

    socket.on(SOCKET_EVENTS.PLAYER_JOIN, (payload) => {
      this.guard(socket, () => this.handleJoin(socket, payload));
    });

    socket.on(SOCKET_EVENTS.PLAYER_RECONNECT, (payload) => {
      this.guard(socket, () => this.handleReconnect(socket, payload));
    });

    socket.on(SOCKET_EVENTS.BUILD_ORDER, (payload) => {
      this.guard(socket, () => this.handleBuildOrder(socket, payload), 2);
    });

    socket.on(SOCKET_EVENTS.PLAYER_MOVE, (payload) => {
      this.guard(socket, () => this.handleMove(socket, payload), 1);
    });

    socket.on('disconnect', (reason) => {
      this.handleDisconnect(socket, reason);
    });
  }

  private guard(socket: Socket, action: () => void, cost = 1): void {
    if (!this.rateLimiter.tryConsume(socket.id, cost)) {
      this.errorHandler.emitToSocket(
        socket,
        new GameError('RATE_LIMITED', 'Zu viele Anfragen. Bitte kurz warten.'),
        socket.id,
      );
      return;
    }

    try {
      action();
    } catch (error) {
      this.errorHandler.emitToSocket(socket, error instanceof GameError ? error : new GameError('ACTION_FAILED', 'Aktion fehlgeschlagen.'), socket.id);
    }
  }

  private handleJoin(socket: Socket, payload: unknown): void {
    const joinPayload = this.inputValidator.validateJoinPayload(payload);
    const lobby = this.lobbyManager.assignLobby();

    if (!lobby.canJoin()) {
      throw new GameError('LOBBY_FULL', `Server voll. Maximal ${serverConfig.maxPlayersPerLobby} Spieler.`);
    }

    const result = lobby.handleJoin(socket.id, joinPayload, this.sessionManager);
    this.bindSocketToLobby(socket, lobby.id);

    socket.emit(SOCKET_EVENTS.LOBBY_ASSIGNED, { lobbyId: lobby.id });
    socket.emit(SOCKET_EVENTS.SESSION_GRANTED, {
      sessionToken: result.session.sessionToken,
      heroId: result.hero.id,
      expiresAt: result.session.expiresAt,
    });

    this.io.emit(SOCKET_EVENTS.PLAYER_JOINED, result.hero);
    if (result.mayorChanged) {
      this.io.emit(SOCKET_EVENTS.MAYOR_CHANGED, {
        mayorId: result.hero.id,
        mayorName: result.hero.name,
      });
    }

    this.getSyncBroadcaster(lobby).sendFullToSocket(socket, lobby.buildWorldState());
    this.broadcastLobby(lobby);
  }

  private handleReconnect(socket: Socket, payload: unknown): void {
    const { sessionToken } = this.inputValidator.validateReconnectPayload(payload);
    const session = this.sessionManager.getSession(sessionToken);
    if (!session) {
      throw new GameError('SESSION_EXPIRED', 'Session abgelaufen. Bitte neu beitreten.');
    }

    const lobby = this.lobbyManager.get(session.lobbyId);
    if (!lobby) {
      throw new GameError('LOBBY_NOT_FOUND', 'Lobby nicht gefunden.');
    }

    const result = lobby.handleReconnect(socket.id, sessionToken, this.sessionManager);
    this.connectionManager.cancelGrace(result.hero.id);
    this.bindSocketToLobby(socket, lobby.id);

    socket.emit(SOCKET_EVENTS.LOBBY_ASSIGNED, { lobbyId: lobby.id });
    socket.emit(SOCKET_EVENTS.SESSION_GRANTED, {
      sessionToken: result.session.sessionToken,
      heroId: result.hero.id,
      expiresAt: result.session.expiresAt,
    });

    this.getSyncBroadcaster(lobby).sendFullToSocket(socket, lobby.buildWorldState());
    this.broadcastLobby(lobby);
  }

  private handleBuildOrder(socket: Socket, payload: unknown): void {
    const lobby = this.requireLobbyForSocket(socket);
    const request = this.inputValidator.validateBuildOrderPayload(payload);
    const result = lobby.handleBuildOrder(socket.id, request);

    this.io.emit(SOCKET_EVENTS.BUILD_ORDER_CREATED, result);
    this.broadcastLobby(lobby);
  }

  private handleMove(socket: Socket, payload: unknown): void {
    const lobby = this.requireLobbyForSocket(socket);
    const direction = this.inputValidator.validateMovePayload(payload);

    if (lobby.handleMove(socket.id, direction)) {
      this.broadcastLobby(lobby);
    }
  }

  private handleDisconnect(socket: Socket, reason: string): void {
    const lobbyId = this.socketToLobby.get(socket.id);
    if (!lobbyId) {
      this.rateLimiter.release(socket.id);
      return;
    }

    const lobby = this.lobbyManager.get(lobbyId);
    if (!lobby) {
      this.cleanupSocket(socket.id);
      return;
    }

    const heroId = lobby.detachSocket(socket.id);
    if (heroId) {
      this.connectionManager.scheduleGraceDisconnect(lobbyId, heroId);
      this.io.emit(SOCKET_EVENTS.PLAYER_DISCONNECTED, { heroId, graceMs: serverConfig.disconnectGraceMs });
      this.broadcastLobby(lobby);
    }

    this.cleanupSocket(socket.id);
    this.logger.info('Client getrennt', { socketId: socket.id, reason, heroId, lobbyId });
  }

  notifyHeroRemoved(lobby: GameRoom, heroId: string, newMayorId?: string, newMayorName?: string): void {
    this.io.emit(SOCKET_EVENTS.PLAYER_LEFT, { heroId });
    if (newMayorId && newMayorName) {
      this.io.emit(SOCKET_EVENTS.MAYOR_CHANGED, { mayorId: newMayorId, mayorName: newMayorName });
    }
    this.broadcastLobby(lobby);
  }

  private bindSocketToLobby(socket: Socket, lobbyId: string): void {
    this.socketToLobby.set(socket.id, lobbyId);
    socket.join(lobbyId);
  }

  private cleanupSocket(socketId: string): void {
    this.socketToLobby.delete(socketId);
    this.rateLimiter.release(socketId);
  }

  private requireLobbyForSocket(socket: Socket): GameRoom {
    const lobbyId = this.socketToLobby.get(socket.id);
    if (!lobbyId) {
      throw new GameError('UNAUTHORIZED', 'Spieler ist nicht in einer Lobby.');
    }

    const lobby = this.lobbyManager.get(lobbyId);
    if (!lobby) {
      throw new GameError('LOBBY_NOT_FOUND', 'Lobby nicht gefunden.');
    }

    const heroId = lobby.entityManager.getHeroIdBySocket(socket.id);
    if (!heroId) {
      throw new GameError('UNAUTHORIZED', 'Keine aktive Spielersession.');
    }

    return lobby;
  }

  private getSyncBroadcaster(lobby: GameRoom): SyncBroadcaster {
    let sync = this.syncByLobby.get(lobby.id);
    if (!sync) {
      const namespace = this.io;
      sync = new SyncBroadcaster(namespace, lobby.stateManager, this.logger.child('sync'));
      this.syncByLobby.set(lobby.id, sync);
    }
    return sync;
  }
}
