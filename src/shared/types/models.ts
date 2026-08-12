export type AccountType = 'cash' | 'bank' | 'alipay' | 'wechat' | 'credit' | 'other'

export interface Account {
  id: number
  name: string
  type: AccountType
  cardNumber: string | null
  creditLimit: number
  billDate: number | null
  dueDate: number | null
  initialBalance: number
  sortOrder: number
  archived: number
  createdAt: number
}

export interface AccountWithBalance extends Account {
  balance: number
  availableCredit?: number
}

export interface AccountInput {
  name: string
  type: AccountType
  initialBalance: number
  cardNumber?: string | null
  creditLimit?: number
  billDate?: number | null
  dueDate?: number | null
}

export type AccountUpdateInput = Partial<Omit<AccountInput, 'name'>> & { name?: string }

export type TransactionType = 'income' | 'expense'

export interface Transaction {
  id: number
  type: TransactionType
  amount: number
  categoryId: number
  accountId: number
  note: string | null
  date: string
  createdAt: number
  updatedAt: number
}

export interface TransactionWithMeta extends Transaction {
  categoryName: string
  accountName: string
  tags: Tag[]
}

export interface TransactionFilter {
  type?: TransactionType
  startDate?: string
  endDate?: string
  categoryIds?: number[]
  accountIds?: number[]
  minAmount?: number
  maxAmount?: number
  keyword?: string
  tagIds?: number[]
  page?: number
  pageSize?: number
}

export interface TransactionInput {
  type: TransactionType
  amount: number
  categoryId: number
  accountId: number
  note?: string | null
  date: string
  tagIds?: number[]
}

export interface TransactionListResult {
  items: TransactionWithMeta[]
  total: number
  page: number
  pageSize: number
}

export type CategoryType = 'income' | 'expense'

export interface Category {
  id: number
  name: string
  type: CategoryType
  parentId: number | null
  sortOrder: number
}

export interface Tag {
  id: number
  name: string
}

export type AssetType = 'fixed' | 'investment' | 'liquid'

export interface Asset {
  id: number
  name: string
  type: AssetType
  value: number
  unit: string | null
  note: string | null
  createdAt: number
}

export interface AssetValue {
  id: number
  assetId: number
  value: number
  date: string
}

export interface Liability {
  id: number
  name: string
  totalAmount: number
  paidAmount: number
  interestRate: number
  note: string | null
}

export interface LedgerMeta {
  path: string
  name: string
  openedAt: number
}

export interface OverviewData {
  netWorth: number
  totalAssets: number
  totalLiabilities: number
  monthIncome: number
  monthExpense: number
  recentTransactions: TransactionWithMeta[]
}

export interface CategoryExpenseItem {
  categoryId: number
  categoryName: string
  amount: number
}

export interface TagExpenseItem {
  tagId: number
  tagName: string
  amount: number
}

export interface MonthlyTrendItem {
  month: string
  income: number
  expense: number
}

export interface NetWorthPoint {
  date: string
  value: number
}

export interface AccountBalanceItem {
  accountId: number
  accountName: string
  accountType: AccountType
  balance: number
  availableCredit: number
  dueDate: number | null
  creditLimit: number
}

export interface DashboardSummary {
  overview: OverviewData
  monthlyTrend: MonthlyTrendItem[]
  expenseByCategory: CategoryExpenseItem[]
}
