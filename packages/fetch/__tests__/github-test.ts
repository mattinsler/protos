import { parseUrl } from '../src/github';

describe('parseUrl', () => {
  // it('correctly parses user/repo urls', () => {
  //   const actual = parseUrl('foo/bar');
  //   expect(actual).toEqual({ repo: 'bar', user: 'foo' });
  // });

  // it('correctly parses user/repo urls', () => {
  //   const actual = parseUrl('foo/bar.baz');
  //   expect(actual).toEqual({ repo: 'bar.baz', user: 'foo' });
  // });

  it('correctly parses https urls', () => {
    const actual = parseUrl('https://github.com/foo/bar.git');
    expect(actual).toEqual({ repo: 'bar', user: 'foo' });
  });

  it('correctly parses https urls', () => {
    const actual = parseUrl('https://github.com/foo/bar.baz.git');
    expect(actual).toEqual({ repo: 'bar.baz', user: 'foo' });
  });

  it('correctly parses git@github urls', () => {
    const actual = parseUrl('git@github.com:foo/bar.git');
    expect(actual).toEqual({ repo: 'bar', user: 'foo' });
  });

  it('correctly parses git@github urls', () => {
    const actual = parseUrl('git@github.com:foo/bar.baz.git');
    expect(actual).toEqual({ repo: 'bar.baz', user: 'foo' });
  });
});
