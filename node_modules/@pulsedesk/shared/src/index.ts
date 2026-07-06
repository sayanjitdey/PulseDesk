// packages/shared/src/index.ts
// ─── Primitive types ──────────────────────────────────────────────────

export type TicketStatus   = 'open' | 'pending' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketChannel  = 'email' | 'widget' | 'api';
export type UserRole       = 'agent' | 'admin' | 'owner';
export type MessageAuthorType = 'customer' | 'agent' | 'ai' | 'system';

// ─── Core entities ────────────────────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'enterprise';
  createdAt: string;
}

export interface User {
  id: string;
  orgId: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  isActive: boolean;
  lastSeenAt?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  orgId: string;
  email: string;
  name?: string;
  phone?: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  orgId: string;
  number: number;
  customerId: string;
  customer?: Customer;
  assigneeId?: string;
  assignee?: User;
  status: TicketStatus;
  priority: TicketPriority;
  channel: TicketChannel;
  subject: string;
  tags: string[];
  aiCategory?: string;
  aiSentiment?: string;
  aiSummary?: string;
  slaBreached: boolean;
  firstResponseDueAt?: string;
  resolutionDueAt?: string;
  firstRespondedAt?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  ticketId: string;
  authorType: MessageAuthorType;
  authorId?: string;
  body: string;
  isInternal: boolean;
  aiDrafted: boolean;
  createdAt: string;
}

export interface AISuggestion {
  id: string;
  ticketId: string;
  body: string;
  confidence: number;
  used: boolean;
  edited: boolean;
  createdAt: string;
}

// ─── API shapes ───────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  org: Organization;
}

export interface RegisterRequest {
  orgName: string;
  email: string;
  password: string;
  name: string;
}

export interface CreateTicketRequest {
  subject: string;
  body: string;
  priority?: TicketPriority;
  channel: TicketChannel;
  customerEmail: string;
  customerName?: string;
}

export interface AddReplyRequest {
  body: string;
  isInternal?: boolean;
}

export interface UpdateTicketRequest {
  status?: TicketStatus;
  priority?: TicketPriority;
  assigneeId?: string | null;
  tags?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface TicketFilters {
  status?: TicketStatus;
  priority?: TicketPriority;
  assigneeId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface DashboardStats {
  openTickets: number;
  pendingTickets: number;
  resolvedToday: number;
  avgResolutionHours: number;
  slaBreachRate: number;
  csatScore: number;
}

// ─── Socket event contracts ───────────────────────────────────────────

export interface ServerToClientEvents {
  'ticket:created':  (ticket: Ticket) => void;
  'ticket:updated':  (ticket: Ticket) => void;
  'message:new':     (message: Message) => void;
  'typing:start':    (data: { agentId: string; agentName: string }) => void;
  'typing:stop':     (data: { agentId: string }) => void;
  'ai:stream-start': (data: { ticketId: string }) => void;
  'ai:stream-chunk': (data: { ticketId: string; chunk: string }) => void;
  'ai:stream-end':   (data: { ticketId: string }) => void;
  'agent:viewing':   (data: { agentId: string; agentName: string }) => void;
  'agent:left':      (data: { agentId: string }) => void;
  'agent:offline':   (data: { agentId: string }) => void;
}

export interface ClientToServerEvents {
  'ticket:join':      (data: { ticketId: string }) => void;
  'ticket:leave':     (data: { ticketId: string }) => void;
  'typing:start':     (data: { ticketId: string }) => void;
  'typing:stop':      (data: { ticketId: string }) => void;
  'ai:stream-reply':  (data: { ticketId: string }) => void;
}