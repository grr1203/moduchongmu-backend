import knex from 'knex';
import { getSecretObject } from './aws/secretsManagerUtil';

const RDS_SECRET = 'rds!db-b78011a9-1016-447d-9360-3ece4c1e2fcc';
let db;

async function getNewDBInstance() {
  let newDB: knex.Knex;

  // RDS Secret을 통해 DB에 접근
  let secret = await getSecretObject(RDS_SECRET);
  newDB = knex({
    client: 'mysql2',
    connection: {
      host: 'database-wooung.ct0mmciowtkg.ap-northeast-2.rds.amazonaws.com',
      user: secret.username,
      password: secret.password,
      port: 3306,
      database: `moduchongmu_${process.env.STAGE}`,
      dateStrings: true,
      timezone: '+09:00',
    },
    pool: { min: 0, max: 1, idleTimeoutMillis: 1000 },
  });
  return newDB;
}

// Password rotation 시 자동으로 새 DB 연결을 받아와서 재시도
async function safeQueryPromise(queryPromise) {
  try {
    return await queryPromise;
  } catch (error) {
    console.log('safeQueryPromise error', error);
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      db = await getNewDBInstance();
      const query = queryPromise.toString();
      const result = await db.raw(query);
      return result[0];
    } else {
      throw error;
    }
  }
}

async function raw(query) {
  db = db || (await getNewDBInstance());
  console.log(`mysql raw() : ${query}`);
  let queryPromise = db.raw(query);
  const result = await safeQueryPromise(queryPromise);
  console.log(`mysql raw result: `, result);
  return result[0];
}

async function create(table: string, createObject: object): Promise<number> {
  db = db || (await getNewDBInstance());
  console.log(`mysql create() table: ${table}, createObject: ${JSON.stringify(createObject)}`);
  let queryPromise = db.insert(createObject).into(table);
  const rows = await safeQueryPromise(queryPromise);
  // mysql에서는 한번에 여러 개의 레코드를 생성했을 경우에도 첫번째 레코드의 id만 반환됨
  // 따라서, rows의 길이로 실제 생성 된 레코드의 개수를 확인할 수 없음
  console.log(`mysql create() rows: ${JSON.stringify(rows)}`);
  return rows;
}

async function getOne(
  table: string,
  attributes: Array<string>,
  where: { [key: string]: any }
): Promise<{ [key: string]: any } | null> {
  db = db || (await getNewDBInstance());
  console.log(`mysql getOne() table: ${table}, attrs: ${attributes}, where: ${JSON.stringify(where)}`);
  let queryPromise = db
    .select(...attributes)
    .from(table)
    .limit(1)
    .where((builder) => {
      for (const filter of Object.entries(where)) {
        builder = Array.isArray(filter[1])
          ? builder.whereIn(filter[0], filter[1])
          : builder.where(filter[0], filter[1]);
      }
    });
  const rows = await safeQueryPromise(queryPromise);
  console.log(`mysql getOne result: `, rows[0]);
  return rows[0] ? rows[0] : null;
}

async function getMany(
  table: string,
  attributes: Array<string>,
  findOptions: { [key: string]: any }
): Promise<Array<{ [key: string]: any }>> {
  db = db || (await getNewDBInstance());
  if (findOptions.offset === undefined && findOptions.limit === undefined && findOptions.order === undefined) {
    // offset, limit, order를 입력하지 않고 where만 들어가 있는 경우 처리
    findOptions.where = JSON.parse(JSON.stringify(findOptions));
    findOptions.offset = 0;
    findOptions.limit = 1000;
  }
  console.log(`mysql getMany() table: ${table}, attrs: ${attributes}, findOptions: ${JSON.stringify(findOptions)}`);

  let queryPromise = db.select(...attributes).from(table);
  if (findOptions.order) {
    findOptions.order.forEach(([column, direction]: [string, string]) => {
      queryPromise = queryPromise.orderBy(column, direction);
    });
  }
  findOptions.offset && queryPromise.offset(findOptions.offset);
  findOptions.limit && queryPromise.limit(findOptions.limit);
  findOptions.where &&
    queryPromise.where((builder) => {
      for (const filter of Object.entries(findOptions.where)) {
        builder = Array.isArray(filter[1])
          ? builder.whereIn(filter[0], filter[1])
          : builder.where(filter[0], filter[1]);
      }
    });

  const rows = await safeQueryPromise(queryPromise);
  console.log(`mysql getMany() rows: ${JSON.stringify(rows)}`);
  return rows;
}

async function getCount(table: string, where: { [key: string]: any }): Promise<number> {
  db = db || (await getNewDBInstance());
  console.log(`mysql getCount() table: ${table}, where: ${JSON.stringify(where)}`);

  let queryPromise = db
    .count('*', { as: 'cnt' })
    .from(table)
    .where((builder) => {
      for (const filter of Object.entries(where)) {
        builder = Array.isArray(filter[1])
          ? builder.whereIn(filter[0], filter[1])
          : builder.where(filter[0], filter[1]);
      }
    });
  const countRow = await safeQueryPromise(queryPromise);
  console.log(`mysql getCount() countRow: ${JSON.stringify(countRow)}`);
  let count = typeof countRow[0].cnt === 'number' ? countRow[0].cnt : parseInt(countRow[0].cnt);
  if (isNaN(count)) {
    throw new Error('getCount: count is not a number');
  }
  return count;
}

async function update(
  table: string,
  updateObject: { [key: string]: any },
  where: { [key: string]: any }
): Promise<{ [key: string]: any }> {
  db = db || (await getNewDBInstance());
  console.log(
    `mysql update() table: ${table}, attrs: ${JSON.stringify(updateObject)}, where: ${JSON.stringify(where)}`
  );
  let queryPromise = db.from(table).where((builder) => {
    for (const filter of Object.entries(where)) {
      builder = Array.isArray(filter[1]) ? builder.whereIn(filter[0], filter[1]) : builder.where(filter[0], filter[1]);
    }
  });
  for (const attr of Object.entries(updateObject)) {
    queryPromise = queryPromise.update(attr[0], attr[1]);
  }
  const rows = await safeQueryPromise(queryPromise);
  console.log(`mysql update() rows: ${JSON.stringify(rows)}`);
  return rows;
}

async function upsert(
  table: string,
  upsertObject: { [key: string]: any },
  duplicateWhere: { [key: string]: any }
): Promise<{ [key: string]: any } | number> {
  db = db || (await getNewDBInstance());
  console.log(
    `mysql upsert() table: ${table}, upsertObject: ${JSON.stringify(upsertObject)}, duplicateWhere: ${duplicateWhere}`
  );
  const exist = await getOne(table, [], duplicateWhere);
  let rows;
  if (exist) {
    rows = await update(table, upsertObject, duplicateWhere);
  } else {
    rows = await create(table, upsertObject);
  }
  console.log(`mysql upsert() rows - ${exist ? 'update' : 'insert'} : ${JSON.stringify(rows)}`);
  return rows;
}

async function deleteMany(table: string, where: { [key: string]: any }): Promise<number> {
  db = db || (await getNewDBInstance());
  console.log(`mysql deleteMany() table: ${table},where: ${JSON.stringify(where)}`);

  let queryPromise = db
    .from(table)
    .where((builder) => {
      for (const filter of Object.entries(where)) {
        builder = Array.isArray(filter[1])
          ? builder.whereIn(filter[0], filter[1])
          : builder.where(filter[0], filter[1]);
      }
    })
    .del();
  const rows = await safeQueryPromise(queryPromise);
  console.log(`mysql deleteMany() rows: ${JSON.stringify(rows)}`);

  return rows;
}

// parameter로 전달받은 table에서 where 조건에 해당하는 row들의 column value를 db의 현재 timestamp 값으로 업데이트한다.
async function updateTimestamp(table: string, column: string, where: { [key: string]: any }): Promise<any> {
  db = db || (await getNewDBInstance());
  console.log('[updateTimestamp parameters]', JSON.stringify({ table, column, where }));
  let queryPromise = db.from(table).where((builder) => {
    for (const filter of Object.entries(where)) {
      builder = Array.isArray(filter[1]) ? builder.whereIn(filter[0], filter[1]) : builder.where(filter[0], filter[1]);
    }
  });
  queryPromise.update(column, db.fn.now());
  const rows = await safeQueryPromise(queryPromise);

  return rows;
}

// searchString 포함된 단어 검색
async function search(table: string, columns: string[], searchString: string) {
  db = db || (await getNewDBInstance());
  console.log(`mysql search() table: ${table}, column: ${columns.join(', ')}, searchString: ${searchString}`);
  let query = `SELECT * FROM ${table} WHERE `;
  query += columns.map((column) => `${column} LIKE '%${searchString}%'`).join(' OR ');
  let queryPromise = db.raw(query);
  const rows = await safeQueryPromise(queryPromise);
  console.log(`mysql search result: `, rows[0]);
  return rows[0];
}

// 정확히 일치하는 경우 검색
async function exactSearch(table: string, attributes: Array<string>, findOptions: { [key: string]: any }) {
  db = db || (await getNewDBInstance());
  console.log(`mysql getSearch() table: ${table}, attrs: ${attributes}, findOptions: ${JSON.stringify(findOptions)}`);

  let queryPromise = db.select(...attributes).from(table);
  findOptions.order && queryPromise.orderBy(findOptions.order[0][0], findOptions.order[0][1]);
  findOptions.offset && queryPromise.offset(findOptions.offset);
  findOptions.limit && queryPromise.limit(findOptions.limit);
  for (let whereLike of findOptions.whereLikes) {
    const builderFunction = (builder) => {
      for (const [key, value] of Object.entries(whereLike)) {
        builder = builder.orWhereILike(key, value);
      }
    };
    findOptions.searchOption?.toLowerCase() === 'or'
      ? queryPromise.orWhere(builderFunction)
      : queryPromise.andWhere(builderFunction);
  }
  findOptions.where &&
    queryPromise.andWhere((builder) => {
      for (const filter of Object.entries(findOptions.where)) {
        builder = Array.isArray(filter[1])
          ? builder.whereIn(filter[0], filter[1])
          : builder.where(filter[0], filter[1]);
      }
    });
  if (findOptions.whereRaw) {
    console.log('[findOptions.whereRaw]', findOptions.whereRaw);
    queryPromise.whereRaw(findOptions.whereRaw);
  }
  if (findOptions.notNull) {
    for (const column of findOptions.notNull) {
      queryPromise.whereNotNull(column);
    }
  }
  const rows = await safeQueryPromise(queryPromise);

  return rows;
}

async function getExactSearchCount(table: string, findOptions: { [key: string]: any }) {
  db = db || (await getNewDBInstance());
  console.log(`mysql getSearchCount() table: ${table}, findOptions: ${JSON.stringify(findOptions)}`);

  let queryPromise = db.count('*', { as: 'cnt' }).from(table);
  for (let whereLike of findOptions.whereLikes) {
    const builderFunction = (builder) => {
      for (const [key, value] of Object.entries(whereLike)) {
        builder = builder.orWhereILike(key, value);
      }
    };
    findOptions.searchOption?.toLowerCase() === 'or'
      ? queryPromise.orWhere(builderFunction)
      : queryPromise.andWhere(builderFunction);
  }
  findOptions.where &&
    queryPromise.andWhere((builder) => {
      for (const filter of Object.entries(findOptions.where)) {
        builder = Array.isArray(filter[1])
          ? builder.whereIn(filter[0], filter[1])
          : builder.where(filter[0], filter[1]);
      }
    });
  if (findOptions.whereRaw) {
    console.log('[findOptions.whereRaw]', findOptions.whereRaw);
    queryPromise.whereRaw(findOptions.whereRaw);
  }
  if (findOptions.notNull) {
    for (const column of findOptions.notNull) {
      queryPromise.whereNotNull(column);
    }
  }
  const countRow = await safeQueryPromise(queryPromise);
  console.log(`mysql getSearchCount() countRow: ${JSON.stringify(countRow)}`);
  let count = typeof countRow[0].cnt === 'number' ? countRow[0].cnt : parseInt(countRow[0].cnt);
  if (isNaN(count)) {
    throw new Error('getSearchCount: count is not a number');
  }
  return count;
}

export default {
  raw,
  getOne,
  getMany,
  getCount,
  update,
  create,
  upsert,
  deleteMany,
  updateTimestamp,
  search,
  exactSearch,
  getExactSearchCount,
};
