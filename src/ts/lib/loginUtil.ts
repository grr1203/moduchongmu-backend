import axios from 'axios';
import jwt from 'jsonwebtoken';
import jwkToPem from 'jwk-to-pem';

// Apple
const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_IDENTIFIER = ['com.dolanap.moduchongmu'];

// https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_rest_api/authenticating_users_with_sign_in_with_apple
export async function verifyAppleToken(identityToken: string) {
  // identityToken에서 kid(key id), alg(encrypt algorithm) 추출
  const { header: decodedHeader } = jwt.decode(identityToken, { complete: true })!;
  console.log('[decodedHeader] ', decodedHeader);

  // Apple Public Key 조회(실시간으로 변함)
  const {
    data: { keys: applePublicKeyArray },
  } = await axios.get('https://appleid.apple.com/auth/keys');
  console.log('[applePublicKeyArray] ', applePublicKeyArray);

  // Apple Public Key Array에서 decode할 identityToken의 kid, alg와 일치하는 key 추출
  const applePublicKey: { kty: 'RSA'; kid: string; use: string; alg: string; n: string; e: string } =
    applePublicKeyArray.filter(
      (key: { kid: string; alg: string }) => decodedHeader.kid === key.kid && decodedHeader.alg === key.alg
    )[0];
  console.log('[applePublicKey] ', applePublicKey);

  // Apple Public Key를 PEM 형식으로 변환
  const applePublicKeyPEM = jwkToPem(applePublicKey);
  console.log('[applePublicKeyPEM] ', applePublicKeyPEM);

  // decode identityToken
  const decoded = jwt.verify(identityToken, applePublicKeyPEM, { algorithms: ['RS256'] });
  console.log('[decoded] ', decoded);
  if (typeof decoded === 'string') return {};

  // identityToken의 iss(issuer), aud(audience) 검증
  const aud = decoded.aud ? (typeof decoded.aud === 'string' ? decoded.aud : decoded.aud[0]) : '';
  if ((decoded.iss === APPLE_ISSUER && APPLE_IDENTIFIER.includes(aud)) === false) return {};

  return decoded;
}

// Google
export async function verifyGoogleCode(idToken: string) {
  // ID Token으로 user data 조회
  const res = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
  console.log('[get google user info response]', res);
  const { email, name } = res.data;

  return { email, name };
}

// Kakao
const KAKAO_REST_API_KEY = 'fe374f8587980d4e1ea4548dbbaced79';

export async function verifyKakaoCode(code: string) {
  // Authorization Code로 Access Token 발급
  let res = await axios.post(
    `https://kauth.kakao.com/oauth/token`,
    {
      grant_type: 'authorization_code',
      client_id: KAKAO_REST_API_KEY,
      redirect_uri: 'http://localhost:5173/signin/redirect?type=kakao',
      code,
    },
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  console.log('[get kakao token response]', res);

  // Access Token으로 user data 조회
  res = await axios.get('https://kapi.kakao.com/v2/user/me', {
    headers: { Authorization: `Bearer ${res.data.access_token}` },
  });
  console.log('[get kakao user info response]', res);
  const { email, nickname: name } = res.data.kakao_account;

  return { email, name };
}

// Naver
const NAVER_CLIENT_ID = "OVSo8apILt8vu2sS4W8V"
const NAVER_CLIENT_SECRET = "3FOgn_W_Ub"

export async function verifyNaverCode(code: string) {
  // Authorization Code로 Access Token 발급
  let res = await axios.get(`https://nid.naver.com/oauth2.0/token`, {
    params: {
      grant_type: 'authorization_code', // 발급
      client_id: NAVER_CLIENT_ID,
      client_secret: NAVER_CLIENT_SECRET,
      code,
      state: 'naver', // cross-site request forgery 방지를 위한 상태 토큰
    },
  });
  console.log('[get naver token response]', res);

  // Access Token으로 user data 조회
  res = await axios.get('https://openapi.naver.com/v1/nid/me', {
    headers: { Authorization: `Bearer ${res.data.access_token}` },
  });
  console.log('[get naver user info response]', res);
  const { email, name } = res.data.response;

  return { email, name };
}
