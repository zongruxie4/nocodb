import { ColumnType } from '~/lib/Api';
import UITypes from '~/lib/UITypes';
import { FormulaDataTypes } from '~/lib/formula/enums';
import { parseProp } from '~/lib/helperFunctions';
import { resolveLookupLeafColumn } from './get-lookup-column-type';

const lookupNumberResultTypes = new Set<UITypes>([
  UITypes.Number,
  UITypes.Decimal,
  UITypes.Currency,
  UITypes.Percent,
  UITypes.Duration,
  UITypes.Rating,
  UITypes.AutoNumber,
  UITypes.Year,
]);

const lookupDateResultTypes = new Set<UITypes>([
  UITypes.Date,
  UITypes.DateTime,
  UITypes.Time,
  UITypes.CreatedTime,
  UITypes.LastModifiedTime,
]);

/**
 * Display-type options offered on the Lookup "Formatting" tab for a given resolved
 * result type. Mirrors Airtable: only number and date result types are formattable.
 */
export function getUITypesForLookupResultType(
  resultType: UITypes | null | undefined
): UITypes[] {
  if (!resultType) return [];
  if (lookupNumberResultTypes.has(resultType)) {
    return [UITypes.Decimal, UITypes.Currency, UITypes.Percent];
  }
  if (lookupDateResultTypes.has(resultType)) {
    return [UITypes.Date, UITypes.DateTime, UITypes.Time];
  }
  return [];
}

function formulaDataTypeToUIType(
  dataType: FormulaDataTypes | undefined
): UITypes {
  switch (dataType) {
    case FormulaDataTypes.NUMERIC:
      return UITypes.Decimal;
    case FormulaDataTypes.DATE:
      return UITypes.Date;
    case FormulaDataTypes.BOOLEAN:
    case FormulaDataTypes.COND_EXP:
      return UITypes.Checkbox;
    case FormulaDataTypes.STRING:
    default:
      return UITypes.SingleLineText;
  }
}

/**
 * Resolve a column's effective "result type", unwrapping computed columns:
 * - Formula -> its `display_type`, else its `parsed_tree.dataType` mapped to a UIType
 * - Rollup  -> numeric (v1: Decimal; rollups are overwhelmingly numeric)
 * - everything else -> its own uidt
 */
export function getColumnResultType(
  column: ColumnType | null | undefined
): UITypes | null {
  if (!column?.uidt) return null;

  switch (column.uidt) {
    case UITypes.Formula: {
      const colMeta = parseProp(column.meta);
      if (colMeta?.display_type) return colMeta.display_type as UITypes;
      return formulaDataTypeToUIType(
        (column.colOptions as any)?.parsed_tree?.dataType
      );
    }
    case UITypes.Rollup: {
      // v1: rollups are treated as numeric. (Edge case: min/max of a date column
      // is a date result — refine if needed.)
      return UITypes.Decimal;
    }
    default:
      return column.uidt as UITypes;
  }
}

/**
 * Resolve the result type of a Lookup column for the Formatting tab — follows the
 * relation + nested-lookup chain to the leaf column, then unwraps Formula/Rollup.
 */
export function getLookupResultType(params: {
  col: ColumnType;
  meta: { columns?: ColumnType[]; base_id?: string };
  metas: Record<string, any>;
  baseId?: string;
  visitedIds?: Set<string>;
}): UITypes | null {
  return getColumnResultType(resolveLookupLeafColumn(params));
}
