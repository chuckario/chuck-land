import { io, Socket } from 'socket.io-client';
import {
  BuildOrderInterface,
  BuildOrderRequest,
  BuildingInterface,
  HeroClass,
  HeroInterface,
  SOCKET_EVENTS,
  WorldState,
} from '@shared/types';
import { CharacterDirection } from '@shared/characterAnimation';

const DEFAULT_SERVER_URL = 'http://localhost:3000';

type WorldStateHandler = (state: WorldState) => void;
type PlayerJoinedHandler = (hero: HeroInterface) => void;
type ErrorHandler = (message: string) => void;
type BuildOrderCreatedHandler = (payload: { order: BuildOrderInterface; building: BuildingInterface }) => void;
type BuildOrderRejectedHandler = (message: string) => void;
type MayorChangedHandler = (payload: { mayorId: string; mayorName: string }) => void;

export class SocketClient {
  private socket: Socket | null = null;
  private worldStateHandler: WorldStateHandler | null = null;
  private playerJoinedHandler: PlayerJoinedHandler | null = null;
  private errorHandler: ErrorHandler | null = null;
  private buildOrderCreatedHandler: BuildOrderCreatedHandler | null = null;
  private buildOrderRejectedHandler: BuildOrderRejectedHandler | null = null;
  private mayorChangedHandler: MayorChangedHandler | null = null;

  connect(serverUrl: string = DEFAULT_SERVER_URL): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      this.socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
      });

      this.socket.on('connect', () => resolve());
      this.socket.on('connect_error', (error) => reject(error));

      this.socket.on(SOCKET_EVENTS.WORLD_STATE, (state: WorldState) => {
        this.worldStateHandler?.(state);
      });

      this.socket.on(SOCKET_EVENTS.PLAYER_JOINED, (hero: HeroInterface) => {
        this.playerJoinedHandler?.(hero);
      });

      this.socket.on(SOCKET_EVENTS.ERROR, (payload: { message: string }) => {
        this.errorHandler?.(payload.message);
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
    });
  }

  join(name: string, classType: HeroClass, profileId: string): void {
    this.socket?.emit(SOCKET_EVENTS.PLAYER_JOIN, { name, classType, profileId });
  }

  issueBuildOrder(request: BuildOrderRequest): void {
    this.socket?.emit(SOCKET_EVENTS.BUILD_ORDER, request);
  }

  move(direction: CharacterDirection): void {
    this.socket?.emit(SOCKET_EVENTS.PLAYER_MOVE, { direction });
  }

  onWorldState(handler: WorldStateHandler): void {
    this.worldStateHandler = handler;
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

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const socketClient = new SocketClient();
