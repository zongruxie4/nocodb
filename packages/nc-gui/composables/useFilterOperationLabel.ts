// `comparisonOpList` / `comparisonSubOpList` in nocodb-sdk return hardcoded
// English labels (`text`) — the SDK is environment-agnostic and cannot reach
// vue-i18n. This composable maps those English labels to i18n keys so the
// filter operation dropdowns render in the active locale.
//
// Symbol operators ('=', '!=', '>', '<', '>=', '<=') and any text without a
// mapping fall through untranslated.
const FILTER_OP_LABEL_KEYS: Record<string, string> = {
  // comparison operators
  'is checked': 'filterOperation.isChecked',
  'is not checked': 'filterOperation.isNotChecked',
  'is': 'filterOperation.is',
  'is not': 'filterOperation.isNot',
  'is equal': 'filterOperation.isEqual',
  'is not equal': 'filterOperation.isNotEqual',
  'is like': 'filterOperation.isLike',
  // legacy key name kept (with the space) so existing locale translations resolve
  'is not like': 'filterOperation.isNot like',
  'filenames contain': 'filterOperation.filenamesContain',
  "filenames don't contain": 'filterOperation.filenamesDoNotContain',
  'is empty': 'filterOperation.isEmpty',
  'is not empty': 'filterOperation.isNotEmpty',
  'is null': 'filterOperation.isNull',
  'is not null': 'filterOperation.isNotNull',
  'contains all of': 'filterOperation.containsAllOf',
  'contains any of': 'filterOperation.containsAnyOf',
  'does not contain all of': 'filterOperation.doesNotContainAllOf',
  'does not contain any of': 'filterOperation.doesNotContainAnyOf',
  'is after': 'filterOperation.isAfter',
  'is before': 'filterOperation.isBefore',
  'is on or after': 'filterOperation.isOnOrAfter',
  'is on or before': 'filterOperation.isOnOrBefore',
  'is within': 'filterOperation.isWithin',
  'is blank': 'filterOperation.isBlank',
  'is not blank': 'filterOperation.isNotBlank',
  // sub-operators (date "is within" / exact date ranges)
  'the past week': 'filterOperation.subOp.pastWeek',
  'the past month': 'filterOperation.subOp.pastMonth',
  'the past year': 'filterOperation.subOp.pastYear',
  'the next week': 'filterOperation.subOp.nextWeek',
  'the next month': 'filterOperation.subOp.nextMonth',
  'the next year': 'filterOperation.subOp.nextYear',
  'the next number of days': 'filterOperation.subOp.nextNumberOfDays',
  'the past number of days': 'filterOperation.subOp.pastNumberOfDays',
  'today': 'filterOperation.subOp.today',
  'tomorrow': 'filterOperation.subOp.tomorrow',
  'yesterday': 'filterOperation.subOp.yesterday',
  'one week ago': 'filterOperation.subOp.oneWeekAgo',
  'one week from now': 'filterOperation.subOp.oneWeekFromNow',
  'one month ago': 'filterOperation.subOp.oneMonthAgo',
  'one month from now': 'filterOperation.subOp.oneMonthFromNow',
  'number of days ago': 'filterOperation.subOp.daysAgo',
  'number of days from now': 'filterOperation.subOp.daysFromNow',
  'exact date': 'filterOperation.subOp.exactDate',
  'exact month': 'filterOperation.subOp.exactMonth',
}

export function useFilterOperationLabel() {
  const { t } = useI18n()

  // Translate a filter operation/sub-operation label produced by the SDK.
  const getFilterOpLabel = (text?: string | null): string => {
    if (!text) return ''

    const key = FILTER_OP_LABEL_KEYS[text]

    return key ? t(key) : text
  }

  return { getFilterOpLabel }
}
