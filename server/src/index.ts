import { createServer } from 'http';
import { Server } from 'socket.io';
import { serverConfig } from './config/serverConfig';
import { GameLoop } from './core/GameLoop';
import { LobbyManager } from './core/LobbyManager';
import { ErrorHandler } from './errors/ErrorHandler';
import { rootLogger } from './logging/Logger';
import { ConnectionManager } from './network/ConnectionManager';
import { SocketGateway } from './network/SocketGateway';
import { PersistenceService } from './persistence/PersistenceService';
import { SqlitePersistence } from './persistence/SqlitePersistence';
import { SessionManager } from './security/SessionManager';

const logger = rootLogger.child('bootstrap');

async function bootstrap(): Promise<void> {
  const httpServer = createServer();
  const io = new Server(httpServer, {
    cors: { origin: serverConfig.corsOrigin },
    pingInterval: 10_000,
    pingTimeout: 5_000,
  });

  const sessionManager = new SessionManager();
  const lobbyManager = new LobbyManager(logger);
  const errorHandler = new ErrorHandler(logger.child('errors'));

  const persistence = new PersistenceService(
    new SqlitePersistence(serverConfig.dbPath, logger.child('sqlite')),
    logger.child('persistence'),
    serverConfig.persistIntervalMs,
  );

  await persistence.initialize();

  const savedSnapshot = await persistence.load(serverConfig.defaultLobbyId);
  const defaultLobby = savedSnapshot
    ? lobbyManager.restoreLobby(savedSnapshot)
    : lobbyManager.getDefaultLobby();

  let socketGateway: SocketGateway;

  const connectionManager = new ConnectionManager(
    sessionManager,
    logger.child('connections'),
    serverConfig.disconnectGraceMs,
    (lobbyId) => lobbyManager.get(lobbyId),
    (lobby, heroId, newMayorId, newMayorName) => {
      socketGateway.notifyHeroRemoved(lobby, heroId, newMayorId, newMayorName);
    },
  );

  socketGateway = new SocketGateway(
    io,
    lobbyManager,
    sessionManager,
    connectionManager,
    errorHandler,
    logger.child('socket'),
  );

  socketGateway.register();
  connectionManager.start();

  const gameLoop = new GameLoop(
    (tick) => {
      for (const lobby of lobbyManager.getAllLobbies()) {
        lobby.simulateTick(tick);
      }
    },
    () => socketGateway.broadcastAllLobbies(),
    logger.child('loop'),
  );

  gameLoop.start();

  persistence.startAutoSave(() => {
    const lobbies = lobbyManager.getAllLobbies();
    if (lobbies.length === 0) {
      return null;
    }
    return defaultLobby.createPersistedSnapshot();
  });

  httpServer.listen(serverConfig.port, () => {
    logger.info('Chuck Land Server gestartet', {
      port: serverConfig.port,
      tickRateHz: serverConfig.tickRateHz,
      syncRateHz: serverConfig.syncRateHz,
      maxPlayers: serverConfig.maxPlayersPerLobby,
      defaultLobby: defaultLobby.id,
      restored: Boolean(savedSnapshot),
      npcs: defaultLobby.professionAiManager.getNpcManager().getAllNpcs().length,
      resources: defaultLobby.resourceManager.getAllResources().length,
      lobbies: lobbyManager.getStats(),
    });
  });

  const shutdown = async (signal: string) => {
    logger.info('Shutdown-Signal empfangen', { signal });
    gameLoop.stop();
    connectionManager.stop();
    persistence.stop();

    try {
      await persistence.saveNow(
        defaultLobby.stateManager,
        defaultLobby.id,
        () => defaultLobby.buildWorldState(),
      );
    } catch (error) {
      logger.error('Finaler Snapshot fehlgeschlagen', {}, error);
    }

    await persistence.close();
    io.close();
    httpServer.close();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((error) => {
  logger.error('Server-Start fehlgeschlagen', {}, error);
  process.exit(1);
});
