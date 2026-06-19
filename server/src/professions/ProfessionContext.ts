import { BuildingManager } from '../BuildingManager';
import { ResourceManager } from '../ResourceManager';
import { WorldManager } from '../WorldManager';

export interface ProfessionContext {
  worldManager: WorldManager;
  buildingManager: BuildingManager;
  resourceManager: ResourceManager;
  timestamp: number;
}