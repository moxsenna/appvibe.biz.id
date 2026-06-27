/**
 * In-memory fake of the Cloudflare D1 `D1Database` API for unit tests.
 *
 * It mimics the small subset of D1 used by the repo layer:
 *   db.prepare(sql).bind(...vals).first() / .all() / .run()
 *
 * Strategy: bind() substitutes positional `?` placeholders with quoted
 * literals up front, then a minimal SQL interpreter handles the rest.
 * It is NOT a real SQL engine — it exists so tests exercise real repo
 * logic without a network. Production code never imports this file.
 */

export function createFakeD1() {
  // table name -> { columns: Map<col, {type}>, rows: Map<pk, row> }
  const tables = new Map();

  function ensureTable(name) {
    if (!tables.has(name)) tables.set(name, { columns: new Map(), rows: new Map(), uniqueIndexes: [] });
    return tables.get(name);
  }

  function coerce(table, col, val) {
    if (val === undefined || val === null) return null;
    const type = table?.columns.get(col)?.type;
    if (type === 'INTEGER') {
      const n = Number(val);
      return Number.isFinite(n) ? Math.trunc(n) : null;
    }
    return val;
  }

  /**
   * Enforce registered unique indexes against a candidate row. Returns true
   * if the row is allowed (no conflict), false if it violates a unique index.
   * Supports partial indexes whose WHERE clause is a single `col = 'lit'`.
   */
  function passesUniqueIndexes(table, row) {
    for (const idx of table.uniqueIndexes || []) {
      // Partial index: only applies when the row matches the WHERE condition.
      if (idx.where) {
        const wm = idx.where.match(/^(\w+)\s*=\s*'([^']*)'$/);
        if (!wm) continue;
        if (row[wm[1]] !== wm[2]) continue;
      }
      const key = idx.cols.map((c) => row[c]).join('\u0000');
      for (const existing of table.rows.values()) {
        if (existing === row) continue;
        if (idx.where) {
          const wm = idx.where.match(/^(\w+)\s*=\s*'([^']*)'$/);
          if (!wm || existing[wm[1]] !== wm[2]) continue;
        }
        const existingKey = idx.cols.map((c) => existing[c]).join('\u0000');
        if (existingKey === key) return false;
      }
    }
    return true;
  }

  /** Replace `?` placeholders with inline quoted literals. */
  function substitute(sql, params) {
    let i = 0;
    return sql.replace(/\?/g, () => {
      const v = params[i++];
      if (v === null || v === undefined) return 'NULL';
      if (typeof v === 'number') return String(v);
      return `'${String(v).replace(/'/g, "''")}'`;
    });
  }

  function parseCreateColumns(sql) {
    const start = sql.indexOf('(');
    const end = sql.lastIndexOf(')');
    if (start < 0 || end < 0) return [];
    const body = sql.slice(start + 1, end);
    return body.split(',').map((part) => {
      const trimmed = part.trim();
      const m = trimmed.match(/^(`?\w+`?)\s+(TEXT|INTEGER|REAL|BLOB|NUMERIC)/i);
      let name, type;
      if (m) {
        name = m[1].replace(/`/g, '');
        type = m[2].toUpperCase();
      } else {
        name = trimmed.split(/\s+/)[0].replace(/`/g, '');
        type = 'TEXT';
      }
      return { name, type };
    });
  }

  function parseVal(literal) {
    if (literal === 'NULL') return null;
    if (/^-?\d+$/.test(literal)) return Number(literal);
    if (/^-?\d+\.\d+$/.test(literal)) return Number(literal);
    if (/^'.*'$/.test(literal)) return literal.slice(1, -1).replace(/''/g, "'");
    return literal;
  }

  /**
   * Evaluate a WHERE clause (AND chains of `col OP literal`) against a row.
   * Supports =, IS, IS NOT, >=, <=, <>, !=, >, <.
   */
  function matchesWhere(clause, row) {
    if (!clause || clause.trim() === '' || /^1\s*=\s*1$/.test(clause.trim())) return true;
    const conds = clause.split(/\s+AND\s+/i);
    return conds.every((raw) => {
      const cond = raw.trim();
      const m = cond.match(/^([`"]?\w+[`"]?)\s+(IS\s+NOT\s+|IS\s+|>=|<=|<>|!=|=|>|<)\s*(.+)$/i);
      if (!m) return false;
      const col = m[1].replace(/[`"]/g, '');
      const op = m[2].toUpperCase().replace(/\s+/g, ' ');
      const rhs = parseVal(m[3].trim());
      const lv = row[col];
      if (op.startsWith('IS')) {
        const wantNull = op.includes('NOT') ? rhs !== null : rhs === null;
        return op.includes('NOT') ? lv !== null : lv === null;
      }
      switch (op) {
        case '=': return lv === rhs;
        case '<>': case '!=': return lv !== rhs;
        case '>': return lv > rhs;
        case '<': return lv < rhs;
        case '>=': return lv >= rhs;
        case '<=': return lv <= rhs;
        default: return false;
      }
    });
  }

  function executeSql(sqlRaw, params = []) {
    // Collapse all whitespace (including newlines) to single spaces so the
    // single-line regexes below match multi-line statements.
    const sql = substitute(sqlRaw.trim().replace(/\s+/g, ' '), params);

    // CREATE TABLE
    const createM = sql.match(/^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([`"]?\w+[`"]?)\s*\(/i);
    if (createM) {
      const name = createM[1].replace(/[`"]/g, '');
      const table = ensureTable(name);
      for (const c of parseCreateColumns(sql)) {
        if (!table.columns.has(c.name)) table.columns.set(c.name, { type: c.type });
      }
      return { meta: { changes: 0 } };
    }

    // Parse and register unique indexes (including partial WHERE clauses).
    const idxM = sql.match(/^CREATE\s+UNIQUE\s+INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s+ON\s+(\w+)\s*\(([^)]*)\)(?:\s+WHERE\s+(.+))?$/i);
    if (idxM) {
      const table = ensureTable(idxM[2]);
      const cols = idxM[3].split(',').map((c) => c.trim());
      table.uniqueIndexes.push({ name: idxM[1], cols, where: idxM[4]?.trim() || null });
      return { meta: { changes: 0 } };
    }
    if (/^CREATE\s+INDEX/i.test(sql)) return { meta: { changes: 0 } };
    if (/^PRAGMA/i.test(sql)) return { meta: { changes: 0 } };

    // INSERT (with optional OR IGNORE / OR REPLACE conflict handling)
    const insM = sql.match(/^INSERT\s+(?:OR\s+(\w+)\s+)?INTO\s+([`"]?\w+[`"]?)\s*\(([^)]*)\)\s*VALUES\s*\(([^)]*)\)/i);
    if (insM) {
      const conflict = (insM[1] || '').toUpperCase();
      const name = insM[2].replace(/[`"]/g, '');
      const cols = insM[3].split(',').map((c) => c.trim().replace(/[`"]/g, ''));
      const vals = insM[4].split(',').map((c) => c.trim());
      const table = ensureTable(name);
      const row = {};
      cols.forEach((col, i) => { row[col] = coerce(table, col, parseVal(vals[i])); });

      // Honor unique constraints. With OR IGNORE a conflict is a no-op.
      if (!passesUniqueIndexes(table, row)) {
        if (conflict === 'IGNORE') return { meta: { changes: 0 } };
        // Other conflict modes fall back to ignore for our purposes.
        return { meta: { changes: 0 } };
      }

      const pkCol = [...table.columns.keys()][0];
      if (row[pkCol] === undefined || row[pkCol] === null) {
        row[pkCol] = table.columns.get(pkCol)?.type === 'INTEGER'
          ? (table.rows.size || 0) + 1
          : crypto.randomUUID();
      }
      table.rows.set(row[pkCol], row);
      return { meta: { changes: 1, last_row_id: row[pkCol] } };
    }

    // UPDATE
    const updM = sql.match(/^UPDATE\s+([`"]?\w+[`"]?)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+))?$/i);
    if (updM) {
      const name = updM[1].replace(/[`"]/g, '');
      const table = tables.get(name);
      if (!table) return { meta: { changes: 0 } };
      const setClause = updM[2];
      const whereClause = updM[3] || '';
      const assignments = setClause.split(',').map((part) => {
        const m = part.trim().match(/^([`"]?\w+[`"]?)\s*=\s*(.+)$/);
        return { col: m[1].replace(/[`"]/g, ''), val: parseVal(m[2].trim()) };
      });
      let changes = 0;
      for (const row of table.rows.values()) {
        if (!matchesWhere(whereClause, row)) continue;
        for (const a of assignments) row[a.col] = coerce(table, a.col, a.val);
        changes++;
      }
      return { meta: { changes } };
    }

    // DELETE
    const delM = sql.match(/^DELETE\s+FROM\s+([`"]?\w+[`"]?)\s*(?:WHERE\s+(.+))?$/i);
    if (delM) {
      const name = delM[1].replace(/[`"]/g, '');
      const table = tables.get(name);
      if (!table) return { meta: { changes: 0 } };
      const whereClause = delM[2] || '';
      let changes = 0;
      for (const [id, row] of [...table.rows.entries()]) {
        if (matchesWhere(whereClause, row)) {
          table.rows.delete(id);
          changes++;
        }
      }
      return { meta: { changes } };
    }

    // SELECT — supports COUNT(*) AS n, * or column list, WHERE, ORDER BY, LIMIT
    const selM = sql.match(/^SELECT\s+(.+?)\s+FROM\s+([`"]?\w+[`"]?)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+(.+?))?(?:\s+LIMIT\s+(\d+))?$/i);
    if (selM) {
      const selectCols = selM[1].trim();
      const name = selM[2].replace(/[`"]/g, '');
      const whereClause = selM[3] || '';
      const orderClause = selM[4];
      const limit = selM[5] ? Number(selM[5]) : null;
      const table = tables.get(name);
      if (!table) return { results: [] };

      let rows = [...table.rows.values()].filter((row) => matchesWhere(whereClause, row));

      // COUNT(*) AS n aggregate
      const countM = selectCols.match(/^COUNT\(\*\)\s+AS\s+(\w+)$/i);
      if (countM) {
        return { results: [{ [countM[1]]: rows.length }] };
      }

      if (orderClause) {
        const parts = orderClause.split(',').map((p) => p.trim());
        rows.sort((a, b) => {
          for (const part of parts) {
            const [col, dir] = part.split(/\s+/);
            const key = col.replace(/[`"]/g, '');
            const av = a[key];
            const bv = b[key];
            if (av === bv) continue;
            const cmp = av < bv ? -1 : 1;
            return dir?.toUpperCase() === 'DESC' ? -cmp : cmp;
          }
          return 0;
        });
      }

      if (limit !== null) rows = rows.slice(0, limit);

      const projected = rows.map((row) => {
        if (selectCols === '*') return { ...row };
        const out = {};
        for (const c of selectCols.split(',').map((s) => s.trim())) {
          const col = c.replace(/[`"]/g, '');
          out[col] = row[col];
        }
        return out;
      });
      return { results: projected, meta: { changes: projected.length } };
    }

    throw new Error(`fake-d1: unsupported SQL: ${sql.slice(0, 120)}`);
  }

  function prepare(sql) {
    let boundParams = [];
    const stmt = {
      bind(...vals) { boundParams = vals; return stmt; },
      async first() { const { results } = executeSql(sql, boundParams); return results[0] || null; },
      async all() { const { results } = executeSql(sql, boundParams); return { results }; },
      async run() { const { meta } = executeSql(sql, boundParams); return { meta }; },
    };
    return stmt;
  }

  async function batch(statements) {
    const out = [];
    for (const st of statements) out.push(await st);
    return out;
  }

  return { prepare, batch, _tables: tables };
}

/**
 * Apply a migration SQL script (semicolon-split statements) to a fake D1.
 * Mirrors what `wrangler d1 migrations apply` does against real D1.
 */
export async function applyMigration(d1, sql) {
  const cleaned = String(sql)
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n');
  for (const raw of cleaned.split(';')) {
    const stmt = raw.trim();
    if (!stmt) continue;
    await d1.prepare(stmt + ';').run();
  }
}
