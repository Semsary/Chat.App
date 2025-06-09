import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

const serviceAccount = {
  type: "service_account",
  project_id: "uae-realestate",
  private_key_id: "c0f34a312958f8a82b530005b0bb8c1aeadfb594",
  private_key:
    "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCvBS+BKEQi5DKS\nt6tuI7tnM5tddxh035dadn8itihDbZ+9KvocI7dUEk7bFqA8hSsB4B8c62ElcV48\ndQ2CcgEGYXCfq+Q1wq+MtdGZMki8Y1IqRQ35/OtUcgdQ4dxEJoN3rKTdxNhRBW98\n/yb1X/sacvDlHcTRDHZ3rP0eu10Ehh0G6i6hPn02GsCLOM39ldQp4kZGRMX5+08h\neqjN5z+GGKdMpNBlSf8YP53+vX/SZR9UB1/1o3YYoymZPQzxBTHTbUbkg1AYEp7y\nKR5jcSQkB/f7KCpUsmKjCgudtH/+w3B+XjyodGSAQO92MJ5r0wNrlyHj2IjMpvVD\nx1ozePjlAgMBAAECggEAK6O6XZUBsEWACq87UoIcVzY59gsdEP8zSP4k4y3SSkXK\nP6u4o02Qh6js+pngqFZ4C8arW1WhammjGqYBEVaFxOaE43tDstfxV796HJ26HycQ\ntLN1MbELqImqI1O9zUxhGXT1wsozObiGPP+N4j7laIniYO6URZ+65ko+7uu+3MJ+\nLditxBgJ3F1u9fQkpRGO6mwjAndSL+jwVXmHEiVunWb8irq/sOGSni9/9gPc7pOj\nLy1MHcDdoHgug4hAM2lzijJQ4i1ALo84A3qlRNlyKhO1OkaeFd/xmqSijCsQQrr5\nXJdEUlLePSj55AN6m7AGhxKg9Nt7FOpCFvhxD9ZRIQKBgQDiM1Dm+/pdO0SyWqQr\nfDMRm2fF7UoCZcpY4+emOFaKPC/gMvfTUkzhg2BN80jSUWN1d/v3z6EfNSF9gpbo\nZbKdGTYwZ9hIYOzKuGGR0DAoh7N+6obxH1KuHRasHXqn0aaA+vJsqeQej4tu3jNs\np1QZpw4ASOQW/Q9sXSsgWQjMuQKBgQDGE8z7706nPBi5rkCnsAVH0BZfWGUMYC2C\n8nUYTXZAeBVlTRpg44gtBDWldsl+s82DxzN55bs5lnqvdg8wMH7yusgLj1sMiyaq\nfvNjCV16s6CjBOHzQGb/gfvAXhh4CVf2zg9yST2wM/3Y/202iwnGND+QDzjP/Ujg\nCDyxibxvjQKBgGGeWczFc9/mYxhBi9YEbJmtopRFeoocWb4Q5PjUGWzg2px8An3d\nZ7ZvFxGs64FwhGa+mCvzHAq2yDQ9NlknAnVP2xX6ytk5kxdNiTX/TblADxO3rPLE\nXM8tWIqA0l04Wg4RvqtsijkyI69+D11VvTKw6Jbw3haZsZ1HfAQiyGxpAoGAMQzU\nNQsUuhsKsGhzQFM5a4gfEitMkpz6iDPMRWFhSCO0gKpwPs/5d9RUCI565TJXUSuy\nFpyKGX+nD+43YqKPvUH9qcctL9UBlTTsxniaOnli7RuXbGplVx50HjXu70K5ErgC\nYTW73fdyBBt0iw4xNHDZ0K3ETtUVB81iYkCOdj0CgYEAhD9vmDMHxVyo+RZDDD4P\nFAElm6EuOgs8bJPiH6d2Ugm7eMgfPgQRfYSA56nW0AftSOM/r1xLx5G0qGHXCNID\nNA17N7aUrxxauB8mMRamBF3OE3dkefMvMHViwQuqPrqq71V49x9ODeTx0pQFnOwz\n3ukzo1oB3b4xnEaio244gwE=\n-----END PRIVATE KEY-----\n",
  client_email:
    "firebase-adminsdk-b7t8b@uae-realestate.iam.gserviceaccount.com",
  client_id: "116995053888619594111",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url:
    "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-b7t8b%40uae-realestate.iam.gserviceaccount.com",
  universe_domain: "googleapis.com",
};


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;
