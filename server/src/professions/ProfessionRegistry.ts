import { ACTIVE_PROFESSIONS, Profession, RESERVED_PROFESSIONS } from '../../../shared/types';
import { ProfessionBehavior } from './BaseProfessionBehavior';
import {
  BlacksmithBehavior,
  BuilderBehavior,
  CarpenterBehavior,
  CookBehavior,
  FarmerBehavior,
  HunterBehavior,
  LeatherworkerBehavior,
  LumberjackBehavior,
  MayorNpcBehavior,
  QuarryWorkerBehavior,
  ReservedProfessionBehavior,
  SoldierBehavior,
  StonemasonBehavior,
  TailorBehavior,
} from './professionBehaviors';

export class ProfessionRegistry {
  private readonly behaviors = new Map<Profession, ProfessionBehavior>();

  constructor() {
    this.registerDefaults();
  }

  register(behavior: ProfessionBehavior): void {
    this.behaviors.set(behavior.profession, behavior);
  }

  get(profession: Profession): ProfessionBehavior | undefined {
    return this.behaviors.get(profession);
  }

  has(profession: Profession): boolean {
    return this.behaviors.has(profession);
  }

  getAll(): ProfessionBehavior[] {
    return Array.from(this.behaviors.values());
  }

  private registerDefaults(): void {
    const coreBehaviors: ProfessionBehavior[] = [
      new LumberjackBehavior(),
      new CarpenterBehavior(),
      new HunterBehavior(),
      new FarmerBehavior(),
      new CookBehavior(),
      new StonemasonBehavior(),
      new BuilderBehavior(),
      new MayorNpcBehavior(),
      new SoldierBehavior(),
      new QuarryWorkerBehavior(),
      new LeatherworkerBehavior(),
      new TailorBehavior(),
      new BlacksmithBehavior(),
    ];

    coreBehaviors.forEach((behavior) => this.register(behavior));

    RESERVED_PROFESSIONS.forEach((profession) => {
      this.register(new ReservedProfessionBehavior(profession));
    });

    ACTIVE_PROFESSIONS.forEach((profession) => {
      if (!this.behaviors.has(profession)) {
        throw new Error(`Berufsverhalten fehlt für ${profession}`);
      }
    });
  }
}
