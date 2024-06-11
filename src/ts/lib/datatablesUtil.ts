import mysqlUtil from './mysqlUtil';

export async function getDataTable(
  table: string,
  columns: string[], // 조회할 column들([]: all)
  range?: number[],
  where?: { [key: string]: any },
  sort: string[] = ['idx', 'desc'],
  whereRaw?: { [key: string]: any },
  notNull?: string[]
) {
  let datatable: { data: Array<{ [key: string]: any }>; count: number; page: number; totalPage: number };
  let findOptions: { [key: string]: any };

  // filter query 생성
  findOptions = { whereLikes: [], where, whereRaw, notNull };

  // range query 생성
  if (range) {
    findOptions.offset = range[0];
    findOptions.limit = range[1] - range[0] + 1;
  }

  // sort query 생성
  if (sort && sort[0] && sort[1]) findOptions.order = [sort.map((item) => item.replace(/ /g, '_'))];

  // datatable 생성
  const searchCount = await mysqlUtil.getExactSearchCount(table, findOptions);
  datatable = {
    data: await mysqlUtil.exactSearch(table, columns, findOptions),
    count: searchCount,
    page: range && range[0] ? Math.ceil((range[0] + 0.1) / findOptions.limit) : 1,
    totalPage: (range && Math.ceil(searchCount / findOptions.limit)) || 1,
  };

  return datatable;
}
