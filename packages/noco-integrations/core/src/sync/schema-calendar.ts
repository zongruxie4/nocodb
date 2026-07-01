import { UITypes, TARGET_TABLES, TARGET_TABLES_META } from 'nocodb-sdk';
import { SyncSchema } from './types';

export const SCHEMA_CALENDAR: SyncSchema = {
  [TARGET_TABLES.CALENDAR_EVENT]: {
    title: TARGET_TABLES_META.calendar_event.label,
    columns: [
      { title: 'Title', uidt: UITypes.SingleLineText, pv: true },
      { title: 'Start', uidt: UITypes.DateTime },
      { title: 'End', uidt: UITypes.DateTime },
      { title: 'All Day', uidt: UITypes.Checkbox },
      { title: 'Recurring Event', uidt: UITypes.Checkbox },
      {
        title: 'Status',
        uidt: UITypes.SingleSelect,
        colOptions: {
          options: [
            { title: 'confirmed' },
            { title: 'tentative' },
            { title: 'cancelled' },
          ],
        },
      },
      { title: 'Location', uidt: UITypes.SingleLineText },
      { title: 'Description', uidt: UITypes.LongText },
      { title: 'Creator', uidt: UITypes.Email },
      { title: 'Attendees', uidt: UITypes.SingleLineText },
      { title: 'Created', uidt: UITypes.DateTime },
      { title: 'Updated', uidt: UITypes.DateTime },
      { title: 'Event ID', uidt: UITypes.SingleLineText },
      { title: 'Event Link', uidt: UITypes.URL },
      { title: 'Hangouts Link', uidt: UITypes.URL },
    ],
    relations: [],
  },
};
