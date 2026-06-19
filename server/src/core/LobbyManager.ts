import { serverConfig } from '../config/serverConfig';
import { GameError } from '../errors/GameError';
import { Logger } from '../logging/Logger';
import { PersistedWorldSnapshot } from '../state/stateTypes';
import { GameRoom } from './GameRoom';

export class LobbyManager {
  private readonly lobbies = new Map<string, GameRoom>();
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger.child('lobbies');
  }

  getOrCreate(lobbyId: string): GameRoom {
    let lobby = this.lobbies.get(lobbyId);
    if (lobby) {
      return lobby;
    }

    if (this.lobbies.size >= serverConfig.maxLobbies) {
      throw new GameError('LOBBY_FULL', 'Maximale Anzahl an Lobbys erreicht.');
    }

    lobby = new GameRoom(lobbyId, this.logger);
    this.lobbies.set(lobbyId, lobby);
    this.logger.info('Lobby erstellt', { lobbyId });
    return lobby;
  }

  get(lobbyId: string): GameRoom | undefined {
    return this.lobbies.get(lobbyId);
  }

  getDefaultLobby(): GameRoom {
    return this.getOrCreate(serverConfig.defaultLobbyId);
  }

  assignLobby(preferredLobbyId?: string): GameRoom {
    if (preferredLobbyId) {
      const preferred = this.get(preferredLobbyId);
      if (preferred?.canJoin()) {
        return preferred;
      }
    }

    for (const lobby of this.lobbies.values()) {
      if (lobby.canJoin()) {
        return lobby;
      }
    }

    if (this.lobbies.size < serverConfig.maxLobbies) {
      const newId = `lobby-${this.lobbies.size + 1}`;
      return this.getOrCreate(newId);
    }

    throw new GameError('LOBBY_FULL', 'Keine freie Lobby verfügbar.');
  }

  restoreLobby(snapshot: PersistedWorldSnapshot): GameRoom {
    const lobby = this.getOrCreate(snapshot.lobbyId);
    lobby.applyPersistedSnapshot(snapshot);
    return lobby;
  }

  getAllLobbies(): GameRoom[] {
    return Array.from(this.lobbies.values());
  }

  getStats(): Array<{ id: string; players: number; maxPlayers: number }> {
    return this.getAllLobbies().map((lobby) => ({
      id: lobby.id,
      players: lobby.playerCount,
      maxPlayers: serverConfig.maxPlayersPerLobby,
    }));
  }
}
