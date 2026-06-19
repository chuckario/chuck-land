import type { CharacterDirection } from './characterAnimation';
import type { WorldBiome } from './biomeConfig';

export type { WorldBiome } from './biomeConfig';

export enum Race {
  HUMAN = 'HUMAN',
  DWARF = 'DWARF',
  ELF = 'ELF',
  RESERVED_RACE_01 = 'RESERVED_RACE_01',
  RESERVED_RACE_02 = 'RESERVED_RACE_02',
  RESERVED_RACE_03 = 'RESERVED_RACE_03',
  RESERVED_RACE_04 = 'RESERVED_RACE_04',
  RESERVED_RACE_05 = 'RESERVED_RACE_05',
  RESERVED_RACE_06 = 'RESERVED_RACE_06',
  RESERVED_RACE_07 = 'RESERVED_RACE_07',
  RESERVED_RACE_08 = 'RESERVED_RACE_08',
  RESERVED_RACE_09 = 'RESERVED_RACE_09',
  RESERVED_RACE_10 = 'RESERVED_RACE_10',
}

export enum HeroClass {
  FIRE_MAGE = 'FIRE_MAGE',
  WATER_MAGE = 'WATER_MAGE',
  ARCANE_MAGE = 'ARCANE_MAGE',
  WARRIOR = 'WARRIOR',
  ARCHER = 'ARCHER',
  ROGUE = 'ROGUE',
  PALADIN = 'PALADIN',
  DRUID = 'DRUID',
  PRIEST = 'PRIEST',
  SUMMONER = 'SUMMONER',
  NECROMANCER = 'NECROMANCER',
  VAMPIRE = 'VAMPIRE',
  WEREWOLF = 'WEREWOLF',
  RESERVED_01 = 'RESERVED_01',
  RESERVED_02 = 'RESERVED_02',
  RESERVED_03 = 'RESERVED_03',
  RESERVED_04 = 'RESERVED_04',
  RESERVED_05 = 'RESERVED_05',
  RESERVED_06 = 'RESERVED_06',
  RESERVED_07 = 'RESERVED_07',
  RESERVED_08 = 'RESERVED_08',
  RESERVED_09 = 'RESERVED_09',
  RESERVED_10 = 'RESERVED_10',
  RESERVED_11 = 'RESERVED_11',
  RESERVED_12 = 'RESERVED_12',
  RESERVED_13 = 'RESERVED_13',
  RESERVED_14 = 'RESERVED_14',
  RESERVED_15 = 'RESERVED_15',
  RESERVED_16 = 'RESERVED_16',
  RESERVED_17 = 'RESERVED_17',
  RESERVED_18 = 'RESERVED_18',
  RESERVED_19 = 'RESERVED_19',
  RESERVED_20 = 'RESERVED_20',
}

export enum HeroRole {
  MAYOR = 'MAYOR',
  CITIZEN = 'CITIZEN',
}

export interface HeroInterface {
  id: string;
  name: string;
  classType: HeroClass;
  race: Race;
  profileId?: string;
  role: HeroRole;
  position: { x: number; y: number };
  level: number;
  xp: number;
  facingDirection?: CharacterDirection;
  attributes: {
    strength: number;
    agility: number;
    intelligence: number;
    spirit: number;
  };
  skills: string[];
}

export enum TerrainType {
  GRASS = 'GRASS',
  WATER = 'WATER',
  SAND = 'SAND',
  STONE = 'STONE',
  FOREST = 'FOREST',
  DIRT = 'DIRT',
}

export const WORLD_TILE_SIZE = 32;
export const WORLD_MAP_WIDTH = 320;
export const WORLD_MAP_HEIGHT = 240;

export interface WorldMapInterface {
  width: number;
  height: number;
  tileSize: number;
  tiles: TerrainType[];
  biomes: WorldBiome[];
  elevations: number[];
}

export interface MapEnemyInterface {
  id: string;
  profileId: string;
  label: string;
  x: number;
  y: number;
  biome: WorldBiome;
  hp: number;
}

export enum BuildingType {
  HOUSE = 'HOUSE',
  TOWN_HALL = 'TOWN_HALL',
  MARKET = 'MARKET',
  WATCHTOWER = 'WATCHTOWER',
  FARM = 'FARM',
}

export enum BuildOrderStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
}

export interface BuildOrderInterface {
  id: string;
  buildingType: BuildingType;
  x: number;
  y: number;
  issuedBy: string;
  status: BuildOrderStatus;
  createdAt: number;
}

export interface BuildingInterface {
  id: string;
  buildingType: BuildingType;
  x: number;
  y: number;
  orderId: string;
  builtAt: number;
}

export interface BuildOrderRequest {
  buildingType: BuildingType;
  x: number;
  y: number;
}

export enum ResourceNodeType {
  TREE = 'TREE',
  STONE_NODE = 'STONE_NODE',
  IRON_ORE = 'IRON_ORE',
  WILD_GAME = 'WILD_GAME',
  CROP = 'CROP',
}

export interface ResourceNodeInterface {
  id: string;
  type: ResourceNodeType;
  x: number;
  y: number;
  amount: number;
  maxAmount: number;
  /** Visual variant index — used for prop frame/size selection on the client. */
  variant?: number;
}

export interface WorldState {
  timestamp: number;
  playerCount: number;
  maxPlayers: number;
  mayorId: string | null;
  heroes: HeroInterface[];
  npcs: NpcInterface[];
  map: WorldMapInterface;
  enemies: MapEnemyInterface[];
  resources: ResourceNodeInterface[];
  buildOrders: BuildOrderInterface[];
  buildings: BuildingInterface[];
}

/** Inkrementeller Weltzustand — nur geänderte Slices seit dem letzten Sync. */
export interface WorldStateDelta {
  version: number;
  timestamp: number;
  /** Vollständiger Zustand bei Join/Reconnect oder periodischem Full-Sync */
  full?: WorldState;
  heroes?: HeroInterface[];
  npcs?: NpcInterface[];
  resources?: ResourceNodeInterface[];
  buildOrders?: BuildOrderInterface[];
  buildings?: BuildingInterface[];
  mayorId?: string | null;
  playerCount?: number;
}

export interface SessionGrantedPayload {
  sessionToken: string;
  heroId: string;
  expiresAt: number;
}

export interface LobbyAssignedPayload {
  lobbyId: string;
}

export enum Profession {
  LUMBERJACK = 'LUMBERJACK',
  CARPENTER = 'CARPENTER',
  HUNTER = 'HUNTER',
  FARMER = 'FARMER',
  COOK = 'COOK',
  STONEMASON = 'STONEMASON',
  BUILDER = 'BUILDER',
  MAYOR = 'MAYOR',
  SOLDIER = 'SOLDIER',
  QUARRY_WORKER = 'QUARRY_WORKER',
  LEATHERWORKER = 'LEATHERWORKER',
  TAILOR = 'TAILOR',
  BLACKSMITH = 'BLACKSMITH',
  RESERVED_PROFESSION_01 = 'RESERVED_PROFESSION_01',
  RESERVED_PROFESSION_02 = 'RESERVED_PROFESSION_02',
  RESERVED_PROFESSION_03 = 'RESERVED_PROFESSION_03',
  RESERVED_PROFESSION_04 = 'RESERVED_PROFESSION_04',
  RESERVED_PROFESSION_05 = 'RESERVED_PROFESSION_05',
  RESERVED_PROFESSION_06 = 'RESERVED_PROFESSION_06',
  RESERVED_PROFESSION_07 = 'RESERVED_PROFESSION_07',
  RESERVED_PROFESSION_08 = 'RESERVED_PROFESSION_08',
  RESERVED_PROFESSION_09 = 'RESERVED_PROFESSION_09',
  RESERVED_PROFESSION_10 = 'RESERVED_PROFESSION_10',
  RESERVED_PROFESSION_11 = 'RESERVED_PROFESSION_11',
  RESERVED_PROFESSION_12 = 'RESERVED_PROFESSION_12',
  RESERVED_PROFESSION_13 = 'RESERVED_PROFESSION_13',
  RESERVED_PROFESSION_14 = 'RESERVED_PROFESSION_14',
  RESERVED_PROFESSION_15 = 'RESERVED_PROFESSION_15',
  RESERVED_PROFESSION_16 = 'RESERVED_PROFESSION_16',
  RESERVED_PROFESSION_17 = 'RESERVED_PROFESSION_17',
  RESERVED_PROFESSION_18 = 'RESERVED_PROFESSION_18',
  RESERVED_PROFESSION_19 = 'RESERVED_PROFESSION_19',
  RESERVED_PROFESSION_20 = 'RESERVED_PROFESSION_20',
}

export enum NpcAiState {
  IDLE = 'IDLE',
  MOVING = 'MOVING',
  WORKING = 'WORKING',
  WAITING = 'WAITING',
}

export enum ProfessionAction {
  IDLE = 'IDLE',
  GATHER_WOOD = 'GATHER_WOOD',
  PROCESS_WOOD = 'PROCESS_WOOD',
  HUNT = 'HUNT',
  TEND_CROPS = 'TEND_CROPS',
  HARVEST = 'HARVEST',
  PREPARE_FOOD = 'PREPARE_FOOD',
  CUT_STONE = 'CUT_STONE',
  CONSTRUCT = 'CONSTRUCT',
  GOVERN = 'GOVERN',
  PATROL = 'PATROL',
  MINE_QUARRY = 'MINE_QUARRY',
  TAN_LEATHER = 'TAN_LEATHER',
  SEW = 'SEW',
  FORGE = 'FORGE',
  PLACEHOLDER = 'PLACEHOLDER',
}

export interface NpcInterface {
  id: string;
  name: string;
  profession: Profession;
  position: { x: number; y: number };
  state: NpcAiState;
  currentAction: ProfessionAction;
}

export const ACTIVE_PROFESSIONS: Profession[] = [
  Profession.LUMBERJACK,
  Profession.CARPENTER,
  Profession.HUNTER,
  Profession.FARMER,
  Profession.COOK,
  Profession.STONEMASON,
  Profession.BUILDER,
  Profession.MAYOR,
  Profession.SOLDIER,
  Profession.QUARRY_WORKER,
  Profession.LEATHERWORKER,
  Profession.TAILOR,
  Profession.BLACKSMITH,
];

export const RESERVED_PROFESSIONS: Profession[] = [
  Profession.RESERVED_PROFESSION_01,
  Profession.RESERVED_PROFESSION_02,
  Profession.RESERVED_PROFESSION_03,
  Profession.RESERVED_PROFESSION_04,
  Profession.RESERVED_PROFESSION_05,
  Profession.RESERVED_PROFESSION_06,
  Profession.RESERVED_PROFESSION_07,
  Profession.RESERVED_PROFESSION_08,
  Profession.RESERVED_PROFESSION_09,
  Profession.RESERVED_PROFESSION_10,
  Profession.RESERVED_PROFESSION_11,
  Profession.RESERVED_PROFESSION_12,
  Profession.RESERVED_PROFESSION_13,
  Profession.RESERVED_PROFESSION_14,
  Profession.RESERVED_PROFESSION_15,
  Profession.RESERVED_PROFESSION_16,
  Profession.RESERVED_PROFESSION_17,
  Profession.RESERVED_PROFESSION_18,
  Profession.RESERVED_PROFESSION_19,
  Profession.RESERVED_PROFESSION_20,
];

export const MAX_PLAYERS = 8;

export const SOCKET_EVENTS = {
  WORLD_STATE: 'world:state',
  PLAYER_JOIN: 'player:join',
  PLAYER_JOINED: 'player:joined',
  PLAYER_LEFT: 'player:left',
  SERVER_FULL: 'server:full',
  ERROR: 'error',
  BUILD_ORDER: 'building:order',
  BUILD_ORDER_CREATED: 'building:order_created',
  BUILD_ORDER_REJECTED: 'building:order_rejected',
  MAYOR_CHANGED: 'mayor:changed',
  PLAYER_MOVE: 'player:move',
  PLAYER_RECONNECT: 'player:reconnect',
  PLAYER_DISCONNECTED: 'player:disconnected',
  SESSION_GRANTED: 'session:granted',
  LOBBY_ASSIGNED: 'lobby:assigned',
  WORLD_STATE_DELTA: 'world:state_delta',
  RATE_LIMITED: 'server:rate_limited',
} as const;
