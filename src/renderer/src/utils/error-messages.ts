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
  INVALID_TERMINATED_AT: '终止日期无效'
}

export function mapErrorCode(code: string | undefined): string {
  if (!code) {
    return '操作失败'
  }
  return errorMessages[code] ?? code
}
