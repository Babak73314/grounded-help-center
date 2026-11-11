import { describe, expect, it } from 'vitest';
import { checkPublic, findProblems, trackedFiles } from '../../scripts/check-public.mjs';
import { synthetic } from './synthetic';

describe('the publication guard', () => {
  it('finds e-mail addresses, telephone numbers, URLs, domains, account ids and ARNs', () => {
    const rules = (text: string) => findProblems(text).map((problem: { rule: string }) => problem.rule);
    expect(rules(`write to ${synthetic.email()}`)).toContain('e-mail address');
    expect(rules(`call ${synthetic.phone()}`)).toContain('telephone number');
    expect(rules(`see ${synthetic.url()}`)).toContain('URL');
    expect(rules(`see ${synthetic.domain()}`)).toContain('domain name');
    expect(rules(`account ${synthetic.accountId()}`)).toContain('AWS account id');
    expect(rules(`role ${synthetic.arn()}`)).toContain('ARN');
  });

  it('allows links to the author’s own GitHub repositories and the local server’s loopback address', () => {
    expect(findProblems(['https:', '', 'github.com', 'Babak73314', 'grounded-help-center'].join('/'))).toEqual([]);
    expect(findProblems(['http:', '', '127.0.0.1:3000', ''].join('/'))).toEqual([]);
    expect(findProblems('ASP.NET Core and 228,000 lines, 45,000 lines')).toEqual([]);
  });

  it('passes on every file this repository tracks', () => {
    expect(checkPublic(trackedFiles()).problems).toEqual([]);
  });
});
