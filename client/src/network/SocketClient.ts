import { io, Socket } from 'socket.io-client';
import {
  BuildOrderInterface,
  BuildOrderRequest,
  BuildingInterface,
  HeroClass,
  HeroInterface,
  SessionGrantedPayload,
  SOCKET_EVENTS,
  WorldState,
  WorldStateDelta,
} from '@shared/types';
import { CharacterDirection } from '@shared/characterAnimation';
import {
  clearStoredSession,
  isStoredSessionValid,
  loadStoredSession,
  saveStoredSession,
  StoredPlayerSession,
} from './sessionStorage';
import { WorldStateStore } from './worldStateStore';

const DEFAULT_SERVER_URL = 'http://localhost:3000';

type WorldStateHandler = (state: WorldState) => void;
type PlayerJoinedHandler = (hero: HeroInterface) => void;
type ErrorHandler = (message: string) => void;
type BuildOrderCreatedHandler = (payload: { order: BuildOrderInterface; building: BuildingInterface }) => void;
type BuildOrderRejectedHandler = (message: string) => void;
type MayorChangedHandler = (payload: { mayorId: string; mayorName: string }) => void;
type ConnectionStateHandler = (connected: boolean) => void;
type SessionExpiredHandler = () => void;

export class SocketClient {
  private socket: Socket | null = null;
  private readonly worldStateStore = new WorldStateStore();
  private session: StoredPlayerSession | null = null;
  private joined = false;
  private pendingRestore: {
    resolve: (hero: HeroInterface) => void;
    reject: (error: Error) => void;
  } | null = null;

  private worldStateHandler: WorldStateHandler | null = null;
  private playerJoinedHandler: PlayerJoinedHandler | null = null;
  private errorHandler: ErrorHandler | null = null;
  private buildOrderCreatedHandler: BuildOrderCreatedHandler | null = null;
  private buildOrderRejectedHandler: BuildOrderRejectedHandler | null = null;
  private mayorChangedHandler: MayorChangedHandler | null = null;
  private connectionStateHandler: ConnectionStateHandler | null = null;
  private sessionExpiredHandler: SessionExpiredHandler | null = null;

  connect(serverUrl: string = DEFAULT_SERVER_URL): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      this.session = loadStoredSession();

      this.socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      let initialConnectResolved = false;

      this.socket.on('connect', () => {
        this.connectionStateHandler?.(true);

        if (this.joined && isStoredSessionValid(this.session)) {
          this.emitReconnect();
        }

        if (!initialConnectResolved) {
          initialConnectResolved = true;
          resolve();
        }
      });

      this.socket.on('connect_error', (error) => {
        if (!initialConnectResolved) {
          initialConnectResolved = true;
          reject(error);
        }
      });

      this.socket.on('disconnect', () => {
        this.connectionStateHandler?.(false);
      });

      this.registerEventHandlers();
    });
  }

  private registerEventHandlers(): void {
    if (!this.socket) {
      return;
    }

    this.socket.on(SOCKET_EVENTS.WORLD_STATE, (state: WorldState) => {
      this.handleWorldState(state);
    });

    this.socket.on(SOCKET_EVENTS.WORLD_STATE_DELTA, (delta: WorldStateDelta) => {
      this.handleWorldStateDelta(delta);
    });

    this.socket.on(SOCKET_EVENTS.SESSION_GRANTED, (payload: SessionGrantedPayload) => {
      this.handleSessionGranted(payload);
    });

    this.socket.on(SOCKET_EVENTS.PLAYER_JOINED, (hero: HeroInterface) => {
      this.playerJoinedHandler?.(hero);
    });

    this.socket.on(SOCKET_EVENTS.PLAYER_LEFT, (payload: { heroId: string }) => {
      if (this.session?.heroId === payload.heroId) {
        this.clearSessionState();
        this.sessionExpiredHandler?.();
      }
    });

    this.socket.on(SOCKET_EVENTS.PLAYER_DISCONNECTED, () => {
      // Grace period — session stays valid for reconnect.
    });

    this.socket.on(SOCKET_EVENTS.ERROR, (payload: { message: string }) => {
      this.handleServerError(payload.message);
    });

    this.socket.on(SOCKET_EVENTS.SERVER_FULL, (payload: { message: string }) => {
      this.errorHandler?.(payload.message);
    });

    this.socket.on(SOCKET_EVENTS.BUILD_ORDER_CREATED, (payload: { order: BuildOrderInterface; building: BuildingInterface }) => {
      this.buildOrderCreatedHandler?.(payload);
    });

    this.socket.on(SOCKET_EVENTS.BUILD_ORDER_REJECTED, (payload: { message: string }) => {
      this.buildOrderRejectedHandler?.(payload.message);
    });

    this.socket.on(SOCKET_EVENTS.MAYOR_CHANGED, (payload: { mayorId: string; mayorName: string }) => {
      this.mayorChangedHandler?.(payload);
    });
  }

  join(name: string, classType: HeroClass, profileId: string): void {
    this.session = {
      sessionToken: '',
      heroId: '',
      expiresAt: 0,
      name,
      classType,
      profileId,
    };
    this.socket?.emit(SOCKET_EVENTS.PLAYER_JOIN, { name, classType, profileId });
  }

  tryRestoreSession(): Promise<HeroInterface | null> {
    this.session = loadStoredSession();
    if (!isStoredSessionValid(this.session)) {
      this.clearSessionState();
      return Promise.resolve(null);
    }

    return new Promise<HeroInterface | null>((resolve, reject) => {
      this.pendingRestore = { resolve, reject };
      this.emitReconnect();

      window.setTimeout(() => {
        if (!this.pendingRestore) {
          return;
        }
        this.pendingRestore.reject(new Error('Session-Wiederherstellung hat zu lange gedauert.'));
        this.pendingRestore = null;
      }, 10_000);
    }).catch((error: Error) => {
      this.errorHandler?.(error.message);
      this.clearSessionState();
      return null;
    });
  }

  issueBuildOrder(request: BuildOrderRequest): void {
    this.socket?.emit(SOCKET_EVENTS.BUILD_ORDER, request);
  }

  move(direction: CharacterDirection): void {
    this.socket?.emit(SOCKET_EVENTS.PLAYER_MOVE, { direction });
  }

  onWorldState(handler: WorldStateHandler): void {
    this.worldStateHandler = handler;
    const current = this.worldStateStore.current;
    if (current) {
      handler(current);
    }
  }

  onPlayerJoined(handler: PlayerJoinedHandler): void {
    this.playerJoinedHandler = handler;
  }

  onError(handler: ErrorHandler): void {
    this.errorHandler = handler;
  }

  onBuildOrderCreated(handler: BuildOrderCreatedHandler): void {
    this.buildOrderCreatedHandler = handler;
  }

  onBuildOrderRejected(handler: BuildOrderRejectedHandler): void {
    this.buildOrderRejectedHandler = handler;
  }

  onMayorChanged(handler: MayorChangedHandler): void {
    this.mayorChangedHandler = handler;
  }

  onConnectionState(handler: ConnectionStateHandler): void {
    this.connectionStateHandler = handler;
  }

  onSessionExpired(handler: SessionExpiredHandler): void {
    this.sessionExpiredHandler = handler;
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.joined = false;
    this.pendingRestore = null;
    this.worldStateStore.reset();
  }

  leavePermanently(): void {
    this.clearSessionState();
    this.disconnect();
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  get hasActiveSession(): boolean {
    return isStoredSessionValid(this.session);
  }

  get storedHeroId(): string | null {
    return this.session?.heroId ?? null;
  }

  private emitReconnect(): void {
    if (!isStoredSessionValid(this.session)) {
      return;
    }

    this.socket?.emit(SOCKET_EVENTS.PLAYER_RECONNECT, {
      sessionToken: this.session.sessionToken,
    });
  }

  private handleWorldState(state: WorldState): void {
    const merged = this.worldStateStore.applyFull(state);
    this.worldStateHandler?.(merged);
    this.resolvePendingRestore(merged);
  }

  private handleWorldStateDelta(delta: WorldStateDelta): void {
    const merged = this.worldStateStore.applyDelta(delta);
    if (!merged) {
      return;
    }

    this.worldStateHandler?.(merged);
    this.resolvePendingRestore(merged);
  }

  private resolvePendingRestore(state: WorldState): void {
    if (!this.pendingRestore || !this.session?.heroId) {
      return;
    }

    const hero = state.heroes.find((entry) => entry.id === this.session?.heroId);
    if (!hero) {
      return;
    }

    this.joined = true;
    this.pendingRestore.resolve(hero);
    this.pendingRestore = null;
  }

  private handleSessionGranted(payload: SessionGrantedPayload): void {
    if (!this.session) {
      this.session = loadStoredSession() ?? {
        sessionToken: payload.sessionToken,
        heroId: payload.heroId,
        expiresAt: payload.expiresAt,
        name: '',
        classType: HeroClass.WARRIOR,
        profileId: '',
      };
    }

    this.session = {
      ...this.session,
      sessionToken: payload.sessionToken,
      heroId: payload.heroId,
      expiresAt: payload.expiresAt,
    };

    saveStoredSession(this.session);
    this.joined = true;
  }

  private handleServerError(message: string): void {
    if (message.includes('Session') || message.includes('session')) {
      this.clearSessionState();
      this.sessionExpiredHandler?.();
      this.pendingRestore?.reject(new Error(message));
      this.pendingRestore = null;
    }

    this.errorHandler?.(message);
  }

  private clearSessionState(): void {
    clearStoredSession();
    this.session = null;
    this.joined = false;
    this.worldStateStore.reset();
  }
}

export const socketClient = new SocketClient();
