export const IpcChannels = {
  ledger: {
    open: 'ledger:open',
    create: 'ledger:create',
    close: 'ledger:close',
    changePassword: 'ledger:changePassword',
    getLastUsed: 'ledger:getLastUsed',
    clearLastUsed: 'ledger:clearLastUsed',
    setBackupReminder: 'ledger:setBackupReminder',
    chooseCreatePath: 'ledger:chooseCreatePath',
    chooseOpenPath: 'ledger:chooseOpenPath'
  },
  transaction: {
    list: 'transaction:list',
    create: 'transaction:create',
    update: 'transaction:update',
    delete: 'transaction:delete'
  },
  account: {
    list: 'account:list',
    create: 'account:create',
    update: 'account:update',
    delete: 'account:delete',
    archive: 'account:archive',
    reorder: 'account:reorder'
  },
  category: {
    list: 'category:list',
    create: 'category:create',
    update: 'category:update',
    delete: 'category:delete'
  },
  tag: {
    list: 'tag:list',
    create: 'tag:create',
    update: 'tag:update',
    delete: 'tag:delete'
  },
  asset: {
    list: 'asset:list',
    create: 'asset:create',
    update: 'asset:update',
    delete: 'asset:delete',
    addValue: 'asset:addValue',
    listValues: 'asset:listValues',
    listLiabilities: 'asset:listLiabilities',
    createLiability: 'asset:createLiability',
    updateLiability: 'asset:updateLiability',
    deleteLiability: 'asset:deleteLiability'
  },
  analytics: {
    overview: 'analytics:overview',
    expenseByCategory: 'analytics:expenseByCategory',
    expenseByTag: 'analytics:expenseByTag',
    monthlyTrend: 'analytics:monthlyTrend',
    netWorth: 'analytics:netWorth',
    accountBalance: 'analytics:accountBalance'
  },
  backup: {
    create: 'backup:create',
    restore: 'backup:restore'
  },
  export: {
    toCsv: 'export:toCsv',
    toJson: 'export:toJson'
  },
  app: {
    getWindowState: 'app:getWindowState',
    openQuickEntry: 'app:openQuickEntry',
    quit: 'app:quit'
  }
} as const

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels] extends string
  ? (typeof IpcChannels)[keyof typeof IpcChannels]
  : never
