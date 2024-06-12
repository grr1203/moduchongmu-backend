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
export async function verifyKakaoCode(kakaoAccessToken: string) {
  // Access Token으로 user data 조회
  const res = await axios.get('https://kapi.kakao.com/v2/user/me', {
    headers: { Authorization: `Bearer ${kakaoAccessToken}` },
  });
  console.log('[get kakao user info response]', res);
  const { email, nickname: name } = res.data.kakao_account;

  return { email, name };
}

// Naver
export async function verifyNaverToken(accessToken: string) {
  // Access Token으로 user data 조회
  const res = await axios.get('https://openapi.naver.com/v1/nid/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  console.log('[get naver user info response]', res);
  const { email, name } = res.data.response;

  return { email, name };
}
