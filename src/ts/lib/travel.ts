import mysqlUtil from './mysqlUtil';

export async function formatTravel(travelObject: {
  idx: number;
  hostIdx: number;
  travelName: string;
  destination: string;
  startDate: string;
  endDate: string;
  settlementDone: number;
  coverImgUrl?: string;
  createdDate: string;
  memo: string;
}) {
  const host = (await mysqlUtil.getOne('tb_user', ['userName'], { idx: travelObject.hostIdx })).userName;

  // 멤버 조회
  const memberArray = (
    await mysqlUtil.getMany('tb_travel_member', ['memberName'], { travelIdx: travelObject.idx })
  ).map((member) => member.memberName);

  const travel = {
    host,
    travelName: travelObject.travelName,
    destination: travelObject.destination,
    memberArray,
    startDate: travelObject.startDate,
    endDate: travelObject.endDate,
    settlementDone: travelObject.settlementDone === 1,
    coverImgUrl: travelObject.coverImgUrl,
    createdDate: travelObject.createdDate,
    memo: travelObject.memo,
  };
  return travel;
}
