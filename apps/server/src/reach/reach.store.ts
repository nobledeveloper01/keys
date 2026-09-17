import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';

import type { Answer, Application, ApplicationEvent } from '@keys/domain';

type Await<T> = Promise<T> | T;

/**
 * Area guide answers and applications (ADR-0014, ADR-0015). Both are
 * appended: an answer is replaced by a later answer from the same tenant
 * only in the guide's arithmetic, and an application's state is a fold over
 * its events.
 */
export abstract class ReachStore {
  abstract answer(a: Answer): Await<void>;
  abstract answersFor(areaId: string): Await<readonly Answer[]>;

  abstract createApplication(a: Application): Await<Application>;
  abstract application(id: string): Await<Application | null>;
  abstract applicationsForTenant(tenantId: string): Await<readonly Application[]>;
  abstract applicationsForAgent(agentId: string): Await<readonly Application[]>;
  abstract applicationsForListing(listingId: string): Await<readonly Application[]>;
  abstract appendApplicationEvent(id: string, event: ApplicationEvent): Await<Application>;

  newId(): string {
    return randomUUID();
  }
}

@Injectable()
export class MemoryReachStore extends ReachStore {
  private readonly answers: Answer[] = [];
  private readonly applications = new Map<string, Application>();

  answer(a: Answer) {
    this.answers.push(a);
  }
  answersFor(areaId: string) {
    return this.answers.filter((a) => a.areaId === areaId);
  }
  createApplication(a: Application) {
    this.applications.set(a.id, a);
    return a;
  }
  application(id: string) {
    return this.applications.get(id) ?? null;
  }
  applicationsForTenant(tenantId: string) {
    return [...this.applications.values()].filter((a) => a.tenantId === tenantId);
  }
  applicationsForAgent(agentId: string) {
    return [...this.applications.values()].filter((a) => a.agentId === agentId);
  }
  applicationsForListing(listingId: string) {
    return [...this.applications.values()].filter((a) => a.listingId === listingId);
  }
  appendApplicationEvent(id: string, event: ApplicationEvent): Application {
    const a = this.applications.get(id);
    if (!a) throw new Error('no such application');
    const next = { ...a, events: [...a.events, event] };
    this.applications.set(id, next);
    return next;
  }
}
