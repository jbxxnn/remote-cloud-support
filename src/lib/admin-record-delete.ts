import type { PoolClient } from "pg";

export async function tableExists(client: PoolClient, tableName: string) {
  const result = await client.query('SELECT to_regclass($1) as table_name', [`"${tableName}"`]);
  return Boolean(result.rows[0]?.table_name);
}

export async function columnExists(client: PoolClient, tableName: string, columnName: string) {
  const result = await client.query(
    `
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = $1
      AND column_name = $2
    LIMIT 1
  `,
    [tableName, columnName]
  );

  return result.rows.length > 0;
}

export async function runIfTableExists(
  client: PoolClient,
  tableName: string,
  sql: string,
  params: any[]
) {
  if (await tableExists(client, tableName)) {
    await client.query(sql, params);
  }
}

export async function runIfColumnExists(
  client: PoolClient,
  tableName: string,
  columnName: string,
  sql: string,
  params: any[]
) {
  if ((await tableExists(client, tableName)) && (await columnExists(client, tableName, columnName))) {
    await client.query(sql, params);
  }
}

export async function deleteAlertRecords(client: PoolClient, alertId: string) {
  if (await tableExists(client, "CallSession")) {
    await runIfTableExists(
      client,
      "CallEvent",
      `
        DELETE FROM "CallEvent"
        WHERE "callSessionId" IN (
          SELECT id FROM "CallSession" WHERE "alertId" = $1
        )
      `,
      [alertId]
    );

    await runIfTableExists(
      client,
      "CallParticipant",
      `
        DELETE FROM "CallParticipant"
        WHERE "callSessionId" IN (
          SELECT id FROM "CallSession" WHERE "alertId" = $1
        )
      `,
      [alertId]
    );

    await runIfTableExists(
      client,
      "CallRecording",
      `
        DELETE FROM "CallRecording"
        WHERE "callSessionId" IN (
          SELECT id FROM "CallSession" WHERE "alertId" = $1
        )
      `,
      [alertId]
    );

    await client.query('DELETE FROM "CallSession" WHERE "alertId" = $1', [alertId]);
  }

  if (await tableExists(client, "Recording")) {
    await runIfTableExists(
      client,
      "NotationTag",
      `
        DELETE FROM "NotationTag"
        WHERE "recordingId" IN (
          SELECT id FROM "Recording" WHERE "alertId" = $1
        )
      `,
      [alertId]
    );

    await runIfTableExists(
      client,
      "Transcript",
      `
        DELETE FROM "Transcript"
        WHERE "alertId" = $1
          OR "recordingId" IN (
            SELECT id FROM "Recording" WHERE "alertId" = $1
          )
      `,
      [alertId]
    );

    await client.query('DELETE FROM "Recording" WHERE "alertId" = $1', [alertId]);
  } else {
    await runIfTableExists(client, "Transcript", 'DELETE FROM "Transcript" WHERE "alertId" = $1', [alertId]);
  }

  if (await tableExists(client, "SOPResponse")) {
    await runIfTableExists(
      client,
      "Evidence",
      `
        DELETE FROM "Evidence"
        WHERE "alertId" = $1
          OR "sopResponseId" IN (
            SELECT id FROM "SOPResponse" WHERE "alertId" = $1
          )
      `,
      [alertId]
    );

    await runIfTableExists(
      client,
      "Transcript",
      `
        DELETE FROM "Transcript"
        WHERE "sopResponseId" IN (
          SELECT id FROM "SOPResponse" WHERE "alertId" = $1
        )
      `,
      [alertId]
    );

    await client.query('DELETE FROM "SOPResponse" WHERE "alertId" = $1', [alertId]);
  } else {
    await runIfTableExists(client, "Evidence", 'DELETE FROM "Evidence" WHERE "alertId" = $1', [alertId]);
  }

  await runIfTableExists(client, "Incident", 'DELETE FROM "Incident" WHERE "alertId" = $1', [alertId]);
  await runIfTableExists(client, "AlertEvent", 'DELETE FROM "AlertEvent" WHERE "alertId" = $1', [alertId]);
  await client.query('DELETE FROM "Alert" WHERE id = $1', [alertId]);
}

export async function deleteDetectionRecords(client: PoolClient, detectionId: string) {
  const alerts = await client.query('SELECT id FROM "Alert" WHERE "detectionId" = $1', [detectionId]);

  for (const alert of alerts.rows) {
    await deleteAlertRecords(client, alert.id);
  }

  await client.query('DELETE FROM "Detection" WHERE id = $1', [detectionId]);
}
