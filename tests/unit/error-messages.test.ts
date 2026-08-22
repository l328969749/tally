import { describe, expect, it } from 'vitest'
import { mapErrorCode } from '@renderer/utils/error-messages'

describe('mapErrorCode', () => {
  it('映射已知业务错误码为中文', () => {
    expect(mapErrorCode('INVALID_AMOUNT')).toBe('金额无效')
    expect(mapErrorCode('ACCOUNT_HAS_TRANSACTIONS')).toBe('该账户下存在流水，不能删除')
    expect(mapErrorCode('INVALID_LEASE_DATES')).toBe('合同日期无效')
    expect(mapErrorCode('TAG_EXISTS')).toBe('该标签已存在')
  })

  it('未知错误码原样返回', () => {
    expect(mapErrorCode('SOME_UNKNOWN_CODE')).toBe('SOME_UNKNOWN_CODE')
  })

  it('空值返回操作失败', () => {
    expect(mapErrorCode(undefined)).toBe('操作失败')
    expect(mapErrorCode('')).toBe('操作失败')
  })
})
