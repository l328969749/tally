const errorMessages: Record<string, string> = {
  ACCOUNT_HAS_TRANSACTIONS: '该账户下存在流水，不能删除',
  CATEGORY_HAS_TRANSACTIONS: '该分类下存在流水，不能删除',
  TAG_EXISTS: '该标签已存在',
  TENANT_HAS_LEASES: '该租户存在关联合同，请先终止合同',
  INVALID_NAME: '名称需为 1-30 个字符',
  INVALID_AMOUNT: '金额无效',
  INVALID_DATE: '日期无效',
  INVALID_ADDRESS: '地址无效',
  INVALID_PHONE: '手机号无效',
  INVALID_ID_NUMBER: '身份证号无效',
  INVALID_LEASE_DATES: '合同日期无效',
  INVALID_RENT: '租金金额无效',
  INVALID_PAY_CYCLE: '付款周期无效',
  INVALID_PROPERTY_VALUE: '房产估值无效',
  INVALID_TERMINATED_AT: '终止日期无效',
  INVALID_CREDIT_ACCOUNT: '信用卡账户无效',
  ACCOUNT_NOT_FOUND: '账户不存在',
  CATEGORY_NOT_FOUND: '分类不存在',
  TAG_NOT_FOUND: '标签不存在',
  ASSET_NOT_FOUND: '资产不存在',
  LIABILITY_NOT_FOUND: '负债不存在',
  PROPERTY_NOT_FOUND: '出租房不存在',
  TENANT_NOT_FOUND: '租户不存在',
  LEASE_NOT_FOUND: '合同不存在',
  TRANSACTION_NOT_FOUND: '流水不存在',
  LEDGER_NOT_OPEN: '账本未打开'
}

export function mapErrorCode(code: string | undefined): string {
  if (!code) {
    return '操作失败'
  }
  return errorMessages[code] ?? code
}
