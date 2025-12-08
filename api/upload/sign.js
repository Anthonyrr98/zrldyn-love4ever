import OSS from 'ali-oss';
import { nanoid } from 'nanoid';

const client = new OSS({
  region: process.env.OSS_REGION,
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  bucket: process.env.OSS_BUCKET,
});

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
  : ['*'];

const sendCORS = (req, res) => {
  const origin = req.headers.origin || '';
  const allowOrigin = allowedOrigins.includes('*') || allowedOrigins.includes(origin)
    ? origin || '*'
    : 'null';

  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Access-Control-Allow-Headers', 'content-type,authorization,x-requested-with');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Max-Age', '86400');
};

const handler = async (req, res) => {
  sendCORS(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { filename, contentType = 'application/octet-stream' } =
      req.body && typeof req.body === 'object' ? req.body : {};

    const safeName = filename && typeof filename === 'string'
      ? filename
      : `${Date.now()}-${nanoid(8)}`;
    const objectKey = `pic4pick/${safeName}`;

    // 生成一次性签名，前端直接 PUT 到 OSS
    const expires = 300; // 秒
    const uploadUrl = client.signatureUrl(objectKey, {
      method: 'PUT',
      expires,
      'Content-Type': contentType,
    });

    return res.status(200).json({
      success: true,
      objectKey,
      uploadUrl,
      headers: {
        'Content-Type': contentType,
        'x-oss-object-acl': 'public-read',
      },
      expiresIn: expires,
      publicUrl: `https://${process.env.OSS_BUCKET}.${process.env.OSS_REGION}.aliyuncs.com/${objectKey}`,
    });
  } catch (error) {
    console.error('签名生成失败:', error);
    return res.status(500).json({ success: false, error: error.message || 'sign failed' });
  }
};

export default handler;

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

