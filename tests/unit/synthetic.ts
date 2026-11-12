/**
 * Contact details, addresses and keys that exist only at run time, to prove
 * that a check refuses them. They are assembled from parts, under the reserved
 * `.invalid` domain, so that no committed file contains an e-mail address,
 * telephone number, URL or access key — not even as an example.
 */
export const synthetic = {
  email: () => ['reader', 'mail.invalid'].join('@'),
  phone: () => `+${'9'.repeat(2)} ${'5'.repeat(3)} ${'0'.repeat(3)} ${'1'.repeat(4)}`,
  url: () => ['https:', '', 'site.invalid', 'page'].join('/'),
  accountId: () => '4'.repeat(12),
  arn: () => ['arn', 'aws', 'iam', '', '4'.repeat(12), 'role/x'].join(':'),
  domain: () => ['www', 'example', 'com'].join('.'),
  accessKey: () => ['AKIA', 'Z'.repeat(16)].join(''),
};
