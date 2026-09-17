import { createPublicKey, verify } from 'node:crypto';
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import {
  AGREEMENT_TEMPLATE_VERSION,
  TEMPLATE_LEGALLY_REVIEWED,
  TICKET_CATEGORIES,
  TICKET_STATES,
  acknowledgedByBoth,
  agreementIsWhole,
  agreementMessage,
  agreementSigned,
  compare,
  mayAppend,
  mayList,
  move,
  movesFor,
  note,
  open,
  portfolio,
  receiptText,
  receipts,
  recordIsWhole,
  recordMessage,
  rentStanding,
  schedule,
  stateOf,
  type Agreement,
  type ConditionRecord,
  type Party,
  type Tenancy,
  type TenancyEntry,
  type TicketCategory,
  type TicketState,
} from '@keys/domain';

import { AgentGuard, type RequestWithAgent } from '../agents/agent.guard';
import { AgentsStore } from '../agents/agents.store';
import { CapturesStore } from '../captures/captures.store';
import { MarketStore } from '../market/market.store';
import { TenantGuard, type RequestWithTenant } from '../market/tenant.guard';
import {
  AcknowledgeBody,
  AgreementBytesView,
  ConditionRecordBody,
  ConditionView,
  PortfolioRowView,
  ReceiptView,
  RoomChangeView,
  TenancyView,
  TicketView,
  CorrectPaymentBody,
  DisputeBody,
  EndBody,
  MoveTicketBody,
  NoteTicketBody,
  OpenTenancyBody,
  OpenTicketBody,
  RecordPaymentBody,
  SignBody,
  TenantKeyBody,
} from './tenancy.dto';
import { TenancyStore } from './tenancy.store';

/** Who is asking: resolved from whichever token the request carries. */
interface Caller {
  readonly id: string;
  readonly party: Party;
}

/**
 * The tenancy (ADR-0009 to ADR-0012). Every rule is asked of the domain;
 * this file checks who is asking, verifies signatures where the keys live,
 * and turns a refusal into a sentence. It records money and never touches
 * it, and no response carries a total across tenancies.
 */
@ApiTags('tenancy')
@Controller('v1')
export class TenancyController {
  constructor(
    private readonly store: TenancyStore,
    private readonly agents: AgentsStore,
    private readonly market: MarketStore,
    private readonly captures: CapturesStore,
  ) {}

  /** Either token. A tenancy has two parties and both read the same record. */
  private async caller(request: Request): Promise<Caller> {
    const agentHeader = request.headers['x-agent-token'];
    const tenantHeader = request.headers['x-tenant-token'];
    const agentToken = Array.isArray(agentHeader) ? '' : (agentHeader ?? '');
    const tenantToken = Array.isArray(tenantHeader) ? '' : (tenantHeader ?? '');
    if (agentToken) {
      const agent = await this.agents.agentByToken(agentToken);
      if (agent) return { id: agent.id, party: 'letting' };
    }
    if (tenantToken) {
      const tenant = await this.market.tenantByToken(tenantToken);
      if (tenant) return { id: tenant.id, party: 'tenant' };
    }
    throw new UnauthorizedException('Sign in first.');
  }

  private async party(id: string, caller: Caller): Promise<Tenancy> {
    const t = await this.store.tenancy(id);
    if (!t) throw new NotFoundException('No such tenancy.');
    const isParty = (caller.party === 'tenant' && t.agreement.tenantId === caller.id) || (caller.party === 'letting' && t.agreement.lettingId === caller.id);
    if (!isParty) throw new NotFoundException('No such tenancy.');
    return t;
  }

  private async publicKeyFor(caller: Caller, deviceId: string | undefined): Promise<string | null> {
    if (caller.party === 'tenant') return (await this.store.tenantKey(caller.id))?.publicKey ?? null;
    if (!deviceId) return null;
    const device = await this.captures.device(deviceId);
    return device && device.agentId === caller.id ? device.publicKey : null;
  }

  private verified(message: string, publicKey: string, signature: unknown): boolean {
    if (typeof signature !== 'string' || signature.length === 0) return false;
    try {
      return verify('sha256', Buffer.from(message, 'utf8'), createPublicKey({ key: Buffer.from(publicKey, 'base64'), format: 'der', type: 'spki' }), Buffer.from(signature, 'base64'));
    } catch {
      return false;
    }
  }

  private view(t: Tenancy) {
    return {
      id: t.id,
      agreement: { ...t.agreement, startsOn: t.agreement.startsOn.toISOString().slice(0, 10) },
      templateLegallyReviewed: TEMPLATE_LEGALLY_REVIEWED,
      signed: agreementSigned(t),
      schedule: schedule(t.agreement).map((d) => ({ ...d, dueOn: d.dueOn.toISOString().slice(0, 10) })),
      recorded: rentStanding(t).map((r) => ({ periodIndex: r.due.index, dueOn: r.due.dueOn.toISOString().slice(0, 10), dueKobo: r.due.amountKobo, recordedKobo: r.recordedKobo, disputed: r.disputed })),
      entries: t.entries,
      // Said on every tenancy response, not only on a screen somebody may not open.
      note: 'Keys records what the parties say happened. It does not receive, hold, move or ask for money.',
    };
  }

  @Post('tenants/me/key')
  @UseGuards(TenantGuard)
  @ApiSecurity('tenant-token')
  @ApiOperation({ summary: "Register this phone's public key, so the tenant can sign." })
  @ApiCreatedResponse()
  async registerKey(@Req() request: RequestWithTenant, @Body() body: TenantKeyBody) {
    const publicKey = (body?.publicKey ?? '').trim();
    if (publicKey.length < 40) throw new BadRequestException('Send the public key.');
    try {
      createPublicKey({ key: Buffer.from(publicKey, 'base64'), format: 'der', type: 'spki' });
    } catch {
      throw new BadRequestException('That is not a public key we can read.');
    }
    await this.store.registerTenantKey(request.tenant!.id, publicKey, new Date());
    return { ok: true };
  }

  @Post('tenancies')
  @UseGuards(AgentGuard)
  @ApiSecurity('agent-token')
  @ApiOperation({ summary: 'Open a tenancy on a property this agent holds authority over. A draft until both sign.' })
  @ApiCreatedResponse({ type: TenancyView })
  async openTenancy(@Req() request: RequestWithAgent, @Body() body: OpenTenancyBody) {
    const agent = request.agent!;
    const now = new Date();
    const evidence = await this.agents.evidenceFor(agent.id);
    if (!mayList(evidence, body?.propertyId ?? '', now)) throw new ForbiddenException('No current authority over that property.');
    const tenant = await this.market.tenantById(body?.tenantId ?? '');
    if (!tenant) throw new BadRequestException('No such tenant.');
    const startsOn = new Date(`${body.startsOn}T00:00:00.000Z`);
    if (Number.isNaN(startsOn.getTime())) throw new BadRequestException('startsOn is a date, like 2026-10-01.');
    const agreement: Agreement = {
      templateVersion: AGREEMENT_TEMPLATE_VERSION,
      propertyId: body.propertyId,
      tenantId: tenant.id,
      lettingId: agent.id,
      rentKobo: Number(body.rentKobo),
      period: body.period,
      periods: Number(body.periods),
      cautionDepositKobo: Number(body.cautionDepositKobo ?? 0),
      startsOn,
    };
    if (!agreementIsWhole(agreement)) throw new BadRequestException('The agreement needs a positive rent in whole kobo, at least one period, and two different parties.');
    const t = await this.store.createTenancy(agreement);
    return this.view(t);
  }

  @Get('tenancies/mine')
  @ApiOperation({ summary: 'My tenancies, as tenant or as the letting side, by whichever token is sent.' })
  @ApiOkResponse({ type: [TenancyView] })
  async mine(@Req() request: Request) {
    const caller = await this.caller(request);
    const list = caller.party === 'tenant' ? await this.store.tenanciesForTenant(caller.id) : await this.store.tenanciesForLetting(caller.id);
    return list.map((t) => this.view(t));
  }

  @Get('tenancies/portfolio')
  @UseGuards(AgentGuard)
  @ApiSecurity('agent-token')
  @ApiOperation({ summary: 'The letting side’s view across its tenancies: facts per tenancy, never a total.' })
  @ApiOkResponse({ type: [PortfolioRowView] })
  async portfolio(@Req() request: RequestWithAgent) {
    const tenancies = await this.store.tenanciesForLetting(request.agent!.id);
    const tickets = (await Promise.all(tenancies.map(async (t) => this.store.ticketsForTenancy(t.id)))).flat();
    return portfolio(tenancies, tickets, new Date()).map((r) => ({ ...r, nextDueOn: r.nextDueOn?.toISOString().slice(0, 10) ?? null }));
  }

  @Get('tenancies/:id')
  @ApiOperation({ summary: 'The record, the same for both parties.' })
  @ApiOkResponse({ type: TenancyView })
  async one(@Req() request: Request, @Param('id') id: string) {
    return this.view(await this.party(id, await this.caller(request)));
  }

  @Get('tenancies/:id/agreement')
  @ApiOperation({ summary: 'The bytes each party signs, and whether the template has been read by a lawyer.' })
  @ApiOkResponse({ type: AgreementBytesView })
  async agreement(@Req() request: Request, @Param('id') id: string) {
    const t = await this.party(id, await this.caller(request));
    return { message: agreementMessage(t.agreement), templateVersion: t.agreement.templateVersion, templateLegallyReviewed: TEMPLATE_LEGALLY_REVIEWED, legalAdvice: 'Keys is not giving legal advice. Either party may take their own.' };
  }

  @Post('tenancies/:id/sign')
  @ApiOperation({ summary: 'Sign the agreement with this party’s device key. Signed by both, it is in force.' })
  @ApiCreatedResponse({ type: TenancyView })
  async sign(@Req() request: Request, @Param('id') id: string, @Body() body: SignBody) {
    const caller = await this.caller(request);
    const t = await this.party(id, caller);
    const key = await this.publicKeyFor(caller, body?.deviceId);
    if (!key) throw new BadRequestException(caller.party === 'tenant' ? 'Register this phone’s key first.' : 'Say which registered device signed.');
    if (!this.verified(agreementMessage(t.agreement), key, body?.signature)) throw new ForbiddenException('That signature is not over this agreement.');
    const entry: TenancyEntry = { kind: 'agreement_signed', by: caller.id, at: new Date(), signature: body.signature };
    if (!mayAppend(t, entry)) throw new ForbiddenException('Already signed by this party, or the tenancy has ended.');
    return this.view(await this.store.append(t.id, entry));
  }

  @Post('tenancies/:id/payments')
  @UseGuards(AgentGuard)
  @ApiSecurity('agent-token')
  @ApiOperation({ summary: 'Record a payment as received. Keys did not receive it.' })
  @ApiCreatedResponse({ type: TenancyView })
  async recordPayment(@Req() request: RequestWithAgent, @Param('id') id: string, @Body() body: RecordPaymentBody) {
    const caller: Caller = { id: request.agent!.id, party: 'letting' };
    const t = await this.party(id, caller);
    const receivedOn = new Date(`${body?.receivedOn}T00:00:00.000Z`);
    if (Number.isNaN(receivedOn.getTime())) throw new BadRequestException('receivedOn is a date.');
    const amount = Number(body?.amountKobo);
    if (!Number.isInteger(amount) || amount <= 0) throw new BadRequestException('The amount is whole kobo, above zero.');
    const periodIndex = Number(body?.periodIndex);
    if (!schedule(t.agreement).some((d) => d.index === periodIndex)) throw new BadRequestException('No such period on this agreement.');
    const entry: TenancyEntry = { kind: 'payment_recorded', id: this.store.newId(), by: caller.id, at: new Date(), periodIndex, amountKobo: amount, receivedOn, note: body?.note?.trim() || null };
    if (!mayAppend(t, entry)) throw new ForbiddenException('The agreement is not signed by both yet, or the tenancy has ended.');
    return this.view(await this.store.append(t.id, entry));
  }

  @Post('tenancies/:id/payments/:paymentId/correct')
  @UseGuards(AgentGuard)
  @ApiSecurity('agent-token')
  @ApiOperation({ summary: 'Correct a recorded amount. The earlier entry stays; the receipt says so.' })
  @ApiCreatedResponse({ type: TenancyView })
  async correct(@Req() request: RequestWithAgent, @Param('id') id: string, @Param('paymentId') paymentId: string, @Body() body: CorrectPaymentBody) {
    const caller: Caller = { id: request.agent!.id, party: 'letting' };
    const t = await this.party(id, caller);
    if (!t.entries.some((e) => e.kind === 'payment_recorded' && e.id === paymentId)) throw new NotFoundException('No such payment on this tenancy.');
    const amount = Number(body?.amountKobo);
    if (!Number.isInteger(amount) || amount < 0) throw new BadRequestException('The amount is whole kobo.');
    const reason = (body?.note ?? '').trim();
    if (!reason) throw new BadRequestException('Say why the earlier entry was wrong.');
    const entry: TenancyEntry = { kind: 'payment_corrected', id: this.store.newId(), by: caller.id, at: new Date(), corrects: paymentId, amountKobo: amount, note: reason };
    if (!mayAppend(t, entry)) throw new ForbiddenException('The tenancy has ended.');
    return this.view(await this.store.append(t.id, entry));
  }

  @Post('tenancies/:id/payments/:paymentId/dispute')
  @UseGuards(TenantGuard)
  @ApiSecurity('tenant-token')
  @ApiOperation({ summary: 'The tenant says a recorded amount is wrong. Both see it.' })
  @ApiCreatedResponse({ type: TenancyView })
  async dispute(@Req() request: RequestWithTenant, @Param('id') id: string, @Param('paymentId') paymentId: string, @Body() body: DisputeBody) {
    const caller: Caller = { id: request.tenant!.id, party: 'tenant' };
    const t = await this.party(id, caller);
    const text = (body?.note ?? '').trim();
    if (!text) throw new BadRequestException('Say what is wrong.');
    const entry: TenancyEntry = { kind: 'payment_disputed', by: caller.id, at: new Date(), disputes: paymentId, note: text };
    if (!mayAppend(t, entry)) throw new ForbiddenException('Only something recorded can be disputed.');
    return this.view(await this.store.append(t.id, entry));
  }

  @Post('tenancies/:id/end')
  @ApiOperation({ summary: 'Either party ends the tenancy. The record stays with both.' })
  @ApiCreatedResponse({ type: TenancyView })
  async end(@Req() request: Request, @Param('id') id: string, @Body() body: EndBody) {
    const caller = await this.caller(request);
    const t = await this.party(id, caller);
    const entry: TenancyEntry = { kind: 'ended', by: caller.id, at: new Date(), note: body?.note?.trim() || null };
    if (!mayAppend(t, entry)) throw new ForbiddenException('Already ended.');
    return this.view(await this.store.append(t.id, entry));
  }

  @Get('tenancies/:id/receipts')
  @ApiOperation({ summary: 'One receipt per recorded payment, carrying any correction rather than hiding it.' })
  @ApiOkResponse({ type: [ReceiptView] })
  async receipts(@Req() request: Request, @Param('id') id: string) {
    const t = await this.party(id, await this.caller(request));
    return receipts(t).map((r) => ({ ...r, text: receiptText(r) }));
  }

  // ---- Maintenance

  @Post('tenancies/:id/tickets')
  @UseGuards(TenantGuard)
  @ApiSecurity('tenant-token')
  @ApiOperation({ summary: 'Raise a ticket. It can never be deleted.' })
  @ApiCreatedResponse({ type: TicketView })
  async openTicket(@Req() request: RequestWithTenant, @Param('id') id: string, @Body() body: OpenTicketBody) {
    const caller: Caller = { id: request.tenant!.id, party: 'tenant' };
    const t = await this.party(id, caller);
    const category = body?.category as TicketCategory;
    if (!(TICKET_CATEGORIES as readonly string[]).includes(category)) throw new BadRequestException('Pick a category from the list.');
    const description = (body?.description ?? '').trim();
    if (!description) throw new BadRequestException('Say what is wrong.');
    const ticket = open(this.store.newId(), t.id, caller.id, new Date(), category, description.slice(0, 2000), body?.photoHashes ?? []);
    return this.ticketView(await this.store.createTicket(ticket), caller.party);
  }

  @Get('tenancies/:id/tickets')
  @ApiOperation({ summary: 'Every ticket on the tenancy, with its whole history.' })
  @ApiOkResponse({ type: [TicketView] })
  async tickets(@Req() request: Request, @Param('id') id: string) {
    const caller = await this.caller(request);
    const t = await this.party(id, caller);
    return (await this.store.ticketsForTenancy(t.id)).map((k) => this.ticketView(k, caller.party));
  }

  private ticketView(k: ReturnType<typeof open>, party: Party) {
    return { id: k.id, tenancyId: k.tenancyId, state: stateOf(k), moves: movesFor(k, party), events: k.events };
  }

  @Post('tickets/:id/move')
  @ApiOperation({ summary: 'Move a ticket along an allowed edge for this party.' })
  @ApiCreatedResponse({ type: TicketView })
  async moveTicket(@Req() request: Request, @Param('id') id: string, @Body() body: MoveTicketBody) {
    const caller = await this.caller(request);
    const k = await this.store.ticket(id);
    if (!k) throw new NotFoundException('No such ticket.');
    await this.party(k.tenancyId, caller);
    const to = body?.to as TicketState;
    if (!(TICKET_STATES as readonly string[]).includes(to)) throw new BadRequestException('Not a state.');
    const moved = move(k, caller.id, caller.party, new Date(), to, body?.note?.trim() || null);
    if (!moved) throw new ForbiddenException(`A ${caller.party} cannot move a ticket from ${stateOf(k)} to ${to}.`);
    return this.ticketView(await this.store.appendTicketEvent(k.id, moved.events[moved.events.length - 1]!), caller.party);
  }

  @Post('tickets/:id/notes')
  @ApiOperation({ summary: 'Add a note and photographs to the history.' })
  @ApiCreatedResponse({ type: TicketView })
  async noteTicket(@Req() request: Request, @Param('id') id: string, @Body() body: NoteTicketBody) {
    const caller = await this.caller(request);
    const k = await this.store.ticket(id);
    if (!k) throw new NotFoundException('No such ticket.');
    await this.party(k.tenancyId, caller);
    const text = (body?.note ?? '').trim();
    if (!text) throw new BadRequestException('Say something.');
    const noted = note(k, caller.id, caller.party, new Date(), text.slice(0, 2000), body?.photoHashes ?? []);
    return this.ticketView(await this.store.appendTicketEvent(k.id, noted.events[noted.events.length - 1]!), caller.party);
  }

  // ---- The condition record

  private recordView(s: { record: ConditionRecord; acknowledgements: readonly { by: string; at: Date; signature: string }[] }, t: Tenancy) {
    return { ...s.record, acknowledgements: s.acknowledgements.map((a) => ({ by: a.by, at: a.at })), acknowledgedByBoth: acknowledgedByBoth(s.acknowledgements, t.agreement.tenantId, t.agreement.lettingId), message: recordMessage(s.record) };
  }

  private recordFromBody(id: string, tenancyId: string, body: ConditionRecordBody): ConditionRecord {
    const takenAt = new Date(body?.takenAt ?? '');
    if (Number.isNaN(takenAt.getTime())) throw new BadRequestException('takenAt is a date-time.');
    const record: ConditionRecord = {
      id,
      tenancyId,
      walk: body.walk,
      comparesTo: body.walk === 'move_out' ? (body.comparesTo ?? null) : null,
      rooms: (body.rooms ?? []).map((r) => ({ name: String(r.name ?? '').trim(), items: (r.items ?? []).map((i) => ({ caption: String(i.caption ?? '').trim(), photoHash: String(i.photoHash ?? '').toLowerCase(), verdict: i.verdict === 'snag' ? 'snag' : 'fine' })) })),
      takenAt,
    };
    if (!recordIsWhole(record)) throw new BadRequestException('A record needs rooms, a caption and a real photograph hash on every item, and a move-out names its move-in.');
    return record;
  }

  @Post('tenancies/:id/condition')
  @ApiOperation({ summary: 'Start a condition record — a draft until both acknowledge the same bytes.' })
  @ApiCreatedResponse({ type: ConditionView })
  async createRecord(@Req() request: Request, @Param('id') id: string, @Body() body: ConditionRecordBody) {
    const caller = await this.caller(request);
    const t = await this.party(id, caller);
    const record = this.recordFromBody(this.store.newId(), t.id, body);
    if (record.comparesTo) {
      const moveIn = await this.store.record(record.comparesTo);
      if (!moveIn || moveIn.record.tenancyId !== t.id || moveIn.record.walk !== 'move_in') throw new BadRequestException('A move-out compares to a move-in on the same tenancy.');
      if (!acknowledgedByBoth(moveIn.acknowledgements, t.agreement.tenantId, t.agreement.lettingId)) throw new ForbiddenException('The move-in is not acknowledged by both yet.');
    }
    return this.recordView(await this.store.createRecord(record), t);
  }

  @Put('condition/:recordId')
  @ApiOperation({ summary: 'Change a draft. Refused once anybody has acknowledged it.' })
  @ApiOkResponse({ type: ConditionView })
  async replaceRecord(@Req() request: Request, @Param('recordId') recordId: string, @Body() body: ConditionRecordBody) {
    const caller = await this.caller(request);
    const s = await this.store.record(recordId);
    if (!s) throw new NotFoundException('No such record.');
    const t = await this.party(s.record.tenancyId, caller);
    if (s.acknowledgements.length > 0) throw new ForbiddenException('Acknowledged records do not change. A later finding is a new record.');
    const draft: ConditionRecordBody = { rooms: body?.rooms ?? [], takenAt: body?.takenAt, walk: s.record.walk };
    if (s.record.comparesTo) draft.comparesTo = s.record.comparesTo;
    const record = this.recordFromBody(s.record.id, t.id, draft);
    return this.recordView(await this.store.replaceRecord(record), t);
  }

  @Post('condition/:recordId/acknowledge')
  @ApiOperation({ summary: 'Sign the record bytes with this party’s device key.' })
  @ApiCreatedResponse({ type: ConditionView })
  async acknowledge(@Req() request: Request, @Param('recordId') recordId: string, @Body() body: AcknowledgeBody) {
    const caller = await this.caller(request);
    const s = await this.store.record(recordId);
    if (!s) throw new NotFoundException('No such record.');
    const t = await this.party(s.record.tenancyId, caller);
    if (s.acknowledgements.some((a) => a.by === caller.id)) throw new ForbiddenException('Already acknowledged by this party.');
    const key = await this.publicKeyFor(caller, body?.deviceId);
    if (!key) throw new BadRequestException(caller.party === 'tenant' ? 'Register this phone’s key first.' : 'Say which registered device signed.');
    if (!this.verified(recordMessage(s.record), key, body?.signature)) throw new ForbiddenException('That signature is not over this record.');
    return this.recordView(await this.store.acknowledge(recordId, { by: caller.id, at: new Date(), signature: body.signature }), t);
  }

  @Get('tenancies/:id/condition')
  @ApiOperation({ summary: 'Every condition record on the tenancy, and who has acknowledged each.' })
  @ApiOkResponse({ type: [ConditionView] })
  async records(@Req() request: Request, @Param('id') id: string) {
    const t = await this.party(id, await this.caller(request));
    return (await this.store.recordsForTenancy(t.id)).map((s) => this.recordView(s, t));
  }

  @Get('condition/:recordId/compare')
  @ApiOperation({ summary: 'A move-out beside its move-in, per room: what changed. Never a number about money.' })
  @ApiOkResponse({ type: [RoomChangeView] })
  async compareRecords(@Req() request: Request, @Param('recordId') recordId: string) {
    const caller = await this.caller(request);
    const out = await this.store.record(recordId);
    if (!out || !out.record.comparesTo) throw new NotFoundException('No such move-out.');
    await this.party(out.record.tenancyId, caller);
    const moveIn = await this.store.record(out.record.comparesTo);
    if (!moveIn) throw new NotFoundException('The move-in is missing.');
    return compare(moveIn.record, out.record);
  }
}
