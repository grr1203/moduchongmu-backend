import mysqlUtil from './mysqlUtil';

export async function formatTravel(travelObject: {
  idx: number;
  uid: string;
  hostIdx: number;
  travelName: string;
  country: string;
  city: string;
  startDate: string;
  endDate: string;
  currency: string;
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
    uid: travelObject.uid,
    host,
    travelName: travelObject.travelName,
    country: travelObject.country,
    city: travelObject.city,
    memberArray,
    startDate: travelObject.startDate,
    endDate: travelObject.endDate,
    currency: travelObject.currency,
    settlementDone: travelObject.settlementDone === 1,
    coverImgUrl: travelObject.coverImgUrl,
    createdDate: travelObject.createdDate,
    memo: travelObject.memo,
  };
  return travel;
}

export async function checkTravelMember(travelUid: string, userIdx: number) {
  const travel = await mysqlUtil.getOne('tb_travel', [], { uid: travelUid });
  if (!travel) return { isMember: false, travel: null };

  const isMember = await mysqlUtil.getOne('tb_travel_member', [], { travelIdx: travel?.idx, userIdx });
  return { isMember: !!isMember, travel };
}

export async function checkTravelHost(travelUid: string, userIdx: number) {
  const travel = await mysqlUtil.getOne('tb_travel', [], { uid: travelUid });
  if (!travel) return { isHost: false, travel: null };

  return { isHost: travel.hostIdx === userIdx, travel };
}

export const getTravelCoverImageKey = (travelUid: string) => `travel/${travelUid}/cover.png`;