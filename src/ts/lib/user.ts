import mysqlUtil from './mysqlUtil';

export async function idxToUser(idxArray: number[]) {
  const userArray = idxArray.map(async (idx) => await mysqlUtil.getOne('tb_user', [], { idx }));
  return await Promise.all(userArray);
}

export const getUserProfileImageKey = (userEmail: number) => `user/${userEmail}/profile.png`;
