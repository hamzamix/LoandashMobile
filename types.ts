// types.ts

export interface AppUser {
  uid: string;
  email: string;
  displayName?: string;
  role: 'admin' | 'developer' | 'client';
  createdAt?: string;
}

export interface Project {
  id: string;
  userId: string;
  title: string;
  description: string;
  logo: string | null;
  createdAt: string;
  isArchived: boolean;
  clientEmails?: string[];
}

export enum RoadmapItemType {
  Add = 'Add',
  Edit = 'Edit',
  Remove = 'Remove',
}

export enum RoadmapItemPriority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Urgent = 'Urgent',
}

export interface RoadmapItem {
  id: string;
  userId: string;
  authorId?: string;
  projectId: string;
  title: string;
  description: string;
  type: keyof typeof RoadmapItemType;
  priority: keyof typeof RoadmapItemPriority;
  createdAt: string;
  isDone: boolean;
  isArchived: boolean;
  isPinned: boolean;
  dueDate: string | null;
  tags?: string[];
  clientEmails?: string[];
}

export interface Comment {
  id: string;
  roadmapItemId: string;
  userId: string;
  authorId: string;
  authorName: string;
  text: string;
  attachments?: string[];
  clientEmails?: string[];
  createdAt: string;
}

export interface TimeEntry {
  id: string;
  userId: string;
  roadmapItemId: string;
  startTime: string;
  endTime: string;
}

export enum LifeEventCategory {
  Birthday = 'Birthday',
  Anniversary = 'Anniversary',
  Maintenance = 'Maintenance',
  Family = 'Family',
  Appointment = 'Appointment',
  PersonalGoal = 'PersonalGoal',
}

export interface LifeEvent {
  id: string;
  userId: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  category: keyof typeof LifeEventCategory;
  isComplete: boolean;
  isRecurring: boolean;
  recurrence?: keyof typeof FinancialItemRecurrence;
}


export interface Payment {
    id: string;
    date: string;
    amount: number;
    method: string;
    notes?: string;
}

export enum FinancialItemCategory {
    Subscription = 'Subscription',
    Bill = 'Bill',
    Debt = 'Debt',
    Loan = 'Loan'
}

export enum FinancialItemDirection {
    Incoming = 'Incoming',
    Outgoing = 'Outgoing'
}

export enum FinancialItemStatus {
    Paid = 'Paid',
    Unpaid = 'Unpaid',
    Partial = 'Partial',
    Overdue = 'Overdue'
}

export enum FinancialItemRecurrence {
    None = 'None',
    Daily = 'Daily',
    Weekly = 'Weekly',
    Monthly = 'Monthly',
    Yearly = 'Yearly'
}

export enum ServiceCategory {
    Entertainment = 'Entertainment',
    Productivity = 'Productivity',
    Utilities = 'Utilities',
    Health = 'Health',
    Education = 'Education',
    Shopping = 'Shopping',
    Other = 'Other'
}

export enum DebtLoanType {
    FriendFamilyCredit = 'Friend/Family Credit',
    BankLoan = 'Bank Loan',
}


export interface FinancialItem {
    id: string;
    userId: string;
    title: string;
    description: string;
    amount: number;
    currency?: string;
    category: keyof typeof FinancialItemCategory;
    direction: keyof typeof FinancialItemDirection;
    status: keyof typeof FinancialItemStatus;
    dueDate: string; // YYYY-MM-DD -> Return Date for Debts/Loans
    paymentHistory?: Payment[];
    isArchived: boolean;
    
    // Recurring fields
    isRecurring: boolean;
    recurrence?: keyof typeof FinancialItemRecurrence;
    recurringPaymentAmount?: number;
    recurrencePeriods?: number; // number of periods (months/weeks/etc.)
    
    // Service-specific fields
    provider?: string;
    serviceCategory?: keyof typeof ServiceCategory;
    endDate?: string | null;
    icon?: string | null;

    // Debt/Loan specific fields
    startDate?: string | null; // Date Taken
    debtLoanType?: keyof typeof DebtLoanType;
    paymentMethodType?: 'manual' | 'auto';
    phone?: string; // Phone number for debt/loan contacts

    // Interest fields
    interestEnabled?: boolean;
    interestRate?: number; // percentage, e.g. 5.5 for 5.5%
    
    // Reminder fields
    enableReminders?: boolean;
    reminderDays?: number;
}