import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Client, GetObjectCommand, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

const client = new S3Client({ region: 'ap-northeast-2' });
const Bucket = `${process.env.APP}-${process.env.STAGE}-bucket`;
export const BucketUrl = `moduchongmu-dev-bucket.s3.ap-northeast-2.amazonaws.com`;

export const getPresignedPostUrl = async (Key: string) => {
  const command = new PutObjectCommand({ Bucket, Key });
  const url = await getSignedUrl(client, command, { expiresIn: 600 });

  return url;
};

export const getPresignedUrl = async (Key: string) => {
  const command = new GetObjectCommand({ Bucket, Key });
  const url = await getSignedUrl(client, command, { expiresIn: 600 });
  console.log('[getPresignedUrl]', url);

  return url;
};

// object head(metadata 등) 정보 조회 or object 존재 여부 확인
export const getHeadObject = async (Key: string) => {
  let res;

  try {
    const command = new HeadObjectCommand({ Bucket, Key });
    res = await client.send(command);
    console.log('[getHeadObject]', res);
  } catch (error) {
    if (error.name === 'NotFound') {
      console.log('Object does not exist.');
      return { error: 'NotFound' };
    } else {
      console.error('Error:', error);
      return { error };
    }
  }

  return res;
};
